import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { checkServerEnv } from "@/lib/server/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = checkServerEnv();
  if (!env.ok) {
    return NextResponse.json({ ok: false, service: "meshly", environment: false, missing: env.missing }, { status: 503 });
  }

  try {
    await getDb().execute(sql`select 1`);
    return NextResponse.json({ ok: true, service: "meshly", environment: true, database: true, time: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Readiness database check failed", error);
    return NextResponse.json({ ok: false, service: "meshly", environment: true, database: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

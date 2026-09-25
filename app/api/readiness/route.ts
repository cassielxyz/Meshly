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

  const db = getDb();

  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    console.error("Readiness database connectivity check failed", error);
    return NextResponse.json(
      { ok: false, service: "meshly", environment: true, database: false, migrations: false },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    // Keep this deliberately read-only. These zero-row probes prove every schema
    // milestone required by migrations 0001-0004 is present without reading user data.
    await db.execute(sql`select id from users limit 0`);
    await db.execute(sql`select id, description, version, trashed_at, source_kind, source_account_id, source_drive_file_id from logical_files limit 0`);
    await db.execute(sql`select id, account_id, drive_file_id, sha256 from chunks limit 0`);
    await db.execute(sql`select user_id, preferences from user_settings limit 0`);
    await db.execute(sql`select id, token_hash, expires_at, max_downloads, revoked_at from shares limit 0`);
    await db.execute(sql`select account_id, change_page_token, last_recovery_snapshot from sync_state limit 0`);
    await db.execute(sql`select key, share_id, attempts, window_started_at from share_auth_attempts limit 0`);
  } catch (error) {
    console.error("Readiness migration/schema check failed", error);
    return NextResponse.json(
      { ok: false, service: "meshly", environment: true, database: true, migrations: false },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true, service: "meshly", environment: true, database: true, migrations: true, time: new Date().toISOString() },
    { headers: { "cache-control": "no-store" } },
  );
}

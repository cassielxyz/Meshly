import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { refreshUserAccounts } from "@/lib/google/account-service";
import { syncDriveAccountChanges } from "@/lib/google/full-sync";
import { writeRecoverySnapshot } from "@/lib/storage/recovery";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await getDb().select({ id: users.id }).from(users).limit(50);
  const results: { userId: string; ok: boolean; written?: number; synced?: number; error?: string }[] = [];
  for (const user of rows) {
    try {
      const accounts = await refreshUserAccounts(user.id);
      let synced = 0;
      for (const account of accounts.filter((item) => item.mode === "full" && item.status === "healthy")) {
        const result = await syncDriveAccountChanges(user.id, account.id);
        if ("changed" in result) synced += result.changed;
      }
      const snapshot = await writeRecoverySnapshot(user.id);
      results.push({ userId: user.id, ok: true, written: snapshot.written, synced });
    } catch (error) {
      results.push({ userId: user.id, ok: false, error: error instanceof Error ? error.message : "maintenance failed" });
    }
  }
  return NextResponse.json({ processed: results.length, results });
}

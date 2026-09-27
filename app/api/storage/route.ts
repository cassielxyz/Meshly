import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { syncState } from "@/db/schema";
import { refreshUserAccounts } from "@/lib/google/account-service";
import { AuthError, requireRequestUser } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireRequestUser(request);
    const db = getDb();
    const force = request.nextUrl.searchParams.get("refresh") === "1";
    const accounts = await refreshUserAccounts(userId, force);
    const states = accounts.length
      ? await db.select().from(syncState).where(inArray(syncState.accountId, accounts.map((account) => account.id)))
      : [];
    const stateMap = new Map(states.map((state) => [state.accountId, state]));
    const safe = accounts.map((account) => ({
      id: account.id,
      email: account.email,
      name: account.name,
      avatarUrl: account.avatarUrl,
      mode: account.mode,
      status: account.status,
      priority: account.priority,
      quotaLimit: account.quotaLimit,
      quotaUsage: account.quotaUsage,
      quotaUsageInDrive: account.quotaUsageInDrive,
      quotaUsageInDriveTrash: account.quotaUsageInDriveTrash,
      free: Math.max(0, account.quotaLimit - account.quotaUsage),
      updatedAt: account.updatedAt.toISOString(),
      lastQuotaRefresh: stateMap.get(account.id)?.lastQuotaRefresh?.toISOString() ?? null,
      lastRecoverySnapshot: stateMap.get(account.id)?.lastRecoverySnapshot?.toISOString() ?? null,
      lastError: stateMap.get(account.id)?.lastError ?? null,
    }));
    const total = safe.reduce((sum, account) => sum + account.quotaLimit, 0);
    const used = safe.reduce((sum, account) => sum + account.quotaUsage, 0);
    const driveUsed = safe.reduce((sum, account) => sum + account.quotaUsageInDrive, 0);
    const driveTrashUsed = safe.reduce((sum, account) => sum + account.quotaUsageInDriveTrash, 0);
    return NextResponse.json({
      total,
      used,
      driveUsed,
      driveTrashUsed,
      free: Math.max(0, total - used),
      healthy: safe.filter((account) => account.status === "healthy").length,
      accounts: safe,
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Storage summary failed", error);
    return NextResponse.json({ error: "storage_failed" }, { status: 500 });
  }
}

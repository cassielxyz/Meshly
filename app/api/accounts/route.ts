import { NextRequest, NextResponse } from "next/server";
import { linkedAccounts } from "@/db/schema";
import { refreshUserAccounts } from "@/lib/google/account-service";
import { AuthError, requireRequestUser } from "@/lib/server/auth";

const sanitize = (account: typeof linkedAccounts.$inferSelect) => ({
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
  createdAt: account.createdAt.toISOString(),
  updatedAt: account.updatedAt.toISOString(),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireRequestUser(request);
    const rows = await refreshUserAccounts(userId, false);
    return NextResponse.json({ accounts: rows.map(sanitize) });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Accounts list failed", error);
    return NextResponse.json({ error: "accounts_failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireRequestUser(request);
    const rows = await refreshUserAccounts(userId, true);
    return NextResponse.json({ accounts: rows.map(sanitize) });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Accounts refresh failed", error);
    return NextResponse.json({ error: "refresh_failed" }, { status: 500 });
  }
}

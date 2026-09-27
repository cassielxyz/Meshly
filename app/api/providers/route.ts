import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { providerAccounts } from "@/db/provider-schema";
import { isDropboxConfigured, refreshDropboxAccount } from "@/lib/providers/dropbox";
import { getTeraBoxAuthorizationUrl, isTeraBoxConfigured, refreshTeraBoxAccount } from "@/lib/providers/terabox";
import { AuthError, requireRequestUser } from "@/lib/server/auth";

function safe(account: typeof providerAccounts.$inferSelect) {
  const metadata = account.metadata as { lastError?: unknown };
  return {
    id: account.id,
    provider: account.provider,
    externalAccountId: account.externalAccountId,
    email: account.email,
    name: account.name,
    avatarUrl: account.avatarUrl,
    status: account.status,
    quotaLimit: account.quotaLimit,
    quotaUsage: account.quotaUsage,
    free: Math.max(0, account.quotaLimit - account.quotaUsage),
    tokenExpiresAt: account.tokenExpiresAt?.toISOString() ?? null,
    updatedAt: account.updatedAt.toISOString(),
    lastError: typeof metadata.lastError === "string" ? metadata.lastError : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireRequestUser(request);
    const db = getDb();
    let accounts = await db.select().from(providerAccounts).where(eq(providerAccounts.userId, userId));
    if (request.nextUrl.searchParams.get("refresh") === "1") {
      await Promise.all(accounts.map(async (account) => {
        if (account.provider === "dropbox") await refreshDropboxAccount(account);
        if (account.provider === "terabox") await refreshTeraBoxAccount(account);
      }));
      accounts = await db.select().from(providerAccounts).where(eq(providerAccounts.userId, userId));
    }

    const dropboxConfigured = isDropboxConfigured();
    const teraboxConfigured = isTeraBoxConfigured();
    return NextResponse.json({
      accounts: accounts.map(safe),
      configuration: {
        dropbox: dropboxConfigured,
        terabox: teraboxConfigured,
        mega: false,
      },
      teraboxAuthorizationUrl: teraboxConfigured ? getTeraBoxAuthorizationUrl() : null,
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Provider summary failed", error);
    return NextResponse.json({ error: "providers_failed" }, { status: 500 });
  }
}

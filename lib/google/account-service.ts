import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { linkedAccounts, syncState } from "@/db/schema";
import { getDriveAbout } from "./drive";
import { refreshGoogleAccessToken } from "./oauth";
import { decryptSecret } from "@/lib/security/crypto";

type Account = typeof linkedAccounts.$inferSelect;
const QUOTA_MAX_AGE_MS = 60_000;

function safeBytes(value: string | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export async function refreshAccountQuota(account: Account) {
  const db = getDb();
  try {
    const access = await refreshGoogleAccessToken(decryptSecret(account.refreshTokenEncrypted));
    const about = await getDriveAbout(access);
    const quotaLimit = safeBytes(about.storageQuota?.limit);
    const quotaUsage = safeBytes(about.storageQuota?.usage);
    const refreshedAt = new Date();

    await db.update(linkedAccounts).set({
      quotaLimit,
      quotaUsage,
      status: "healthy",
      updatedAt: refreshedAt,
    }).where(eq(linkedAccounts.id, account.id));

    await db.insert(syncState).values({
      accountId: account.id,
      lastQuotaRefresh: refreshedAt,
      lastError: null,
    }).onConflictDoUpdate({
      target: syncState.accountId,
      set: { lastQuotaRefresh: refreshedAt, lastError: null, updatedAt: refreshedAt },
    });

    return {
      ok: true as const,
      quotaLimit,
      quotaUsage,
      driveUsage: safeBytes(about.storageQuota?.usageInDrive),
      driveTrashUsage: safeBytes(about.storageQuota?.usageInDriveTrash),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "quota refresh failed";
    const status = /\((400|401)\)/.test(message) ? "needs_reauth" : "error";
    const refreshedAt = new Date();
    await db.update(linkedAccounts).set({ status, updatedAt: refreshedAt }).where(eq(linkedAccounts.id, account.id));
    await db.insert(syncState).values({ accountId: account.id, lastError: message }).onConflictDoUpdate({
      target: syncState.accountId,
      set: { lastError: message, updatedAt: refreshedAt },
    });
    return { ok: false as const, error: message };
  }
}

export async function refreshUserAccounts(userId: string, force = false) {
  const db = getDb();
  const accounts = await db.select().from(linkedAccounts).where(eq(linkedAccounts.userId, userId));
  if (!accounts.length) return accounts;

  const states = await db.select().from(syncState).where(inArray(syncState.accountId, accounts.map((account) => account.id)));
  const stateMap = new Map(states.map((state) => [state.accountId, state]));
  const now = Date.now();

  await Promise.all(accounts.map(async (account) => {
    const lastRefresh = stateMap.get(account.id)?.lastQuotaRefresh;
    const fresh = lastRefresh && now - lastRefresh.getTime() < QUOTA_MAX_AGE_MS;
    if (!force && fresh) return;
    await refreshAccountQuota(account);
  }));

  return db.select().from(linkedAccounts).where(eq(linkedAccounts.userId, userId));
}

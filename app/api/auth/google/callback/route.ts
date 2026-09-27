import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { linkedAccounts, users } from "@/db/schema";
import { ensureMeshlyFolder, getDriveAbout } from "@/lib/google/drive";
import { exchangeGoogleCode, getGoogleProfile, type GoogleMode } from "@/lib/google/oauth";
import { createSessionToken, encryptSecret, verifySessionToken } from "@/lib/security/crypto";

function safeBytes(value: string | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export async function GET(request: NextRequest) {
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, request.url));
  try {
    const code = request.nextUrl.searchParams.get("code");
    const returnedState = request.nextUrl.searchParams.get("state");
    const state = request.cookies.get("meshly_oauth_state")?.value;
    const verifier = request.cookies.get("meshly_oauth_verifier")?.value;
    const mode = (request.cookies.get("meshly_oauth_mode")?.value === "full" ? "full" : "managed") as GoogleMode;
    const targetAccountId = request.cookies.get("meshly_oauth_target")?.value;
    if (!code || !state || !verifier || returnedState !== state) return fail("oauth_state_invalid");

    let userId: string | undefined;
    const existingSession = request.cookies.get("meshly_session")?.value;
    if (existingSession) {
      try {
        userId = (await verifySessionToken(existingSession)).userId;
      } catch {
        // A stale session should not block an ordinary fresh sign-in.
      }
    }

    const db = getDb();
    let targetedAccount: typeof linkedAccounts.$inferSelect | undefined;
    if (targetAccountId) {
      if (!userId) return fail("session_required_for_account_upgrade");
      targetedAccount = (await db.select().from(linkedAccounts).where(and(eq(linkedAccounts.id, targetAccountId), eq(linkedAccounts.userId, userId))).limit(1))[0];
      if (!targetedAccount) return fail("oauth_target_invalid");
    }

    const tokens = await exchangeGoogleCode(code, verifier);
    const [profile, about, folderId] = await Promise.all([
      getGoogleProfile(tokens.access_token),
      getDriveAbout(tokens.access_token),
      ensureMeshlyFolder(tokens.access_token),
    ]);
    if (targetedAccount && targetedAccount.googleSubject !== profile.sub) return fail("wrong_google_account_selected");

    const globallyLinked = (await db.select().from(linkedAccounts).where(eq(linkedAccounts.googleSubject, profile.sub)).limit(1))[0];
    if (userId && globallyLinked && globallyLinked.userId !== userId) return fail("google_account_already_linked");

    if (!userId && globallyLinked) {
      userId = globallyLinked.userId;
      await db.update(users).set({ name: profile.name, avatarUrl: profile.picture, updatedAt: new Date() }).where(eq(users.id, userId));
    }

    if (!userId) {
      const existingUser = (await db.select().from(users).where(eq(users.email, profile.email)).limit(1))[0];
      if (existingUser) {
        userId = existingUser.id;
        await db.update(users).set({ name: profile.name, avatarUrl: profile.picture, updatedAt: new Date() }).where(eq(users.id, userId));
      } else {
        userId = nanoid();
        await db.insert(users).values({ id: userId, email: profile.email, name: profile.name, avatarUrl: profile.picture });
      }
    }

    const old = targetedAccount ?? (await db.select().from(linkedAccounts).where(and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.googleSubject, profile.sub))).limit(1))[0];
    const refreshTokenEncrypted = tokens.refresh_token ? encryptSecret(tokens.refresh_token) : old?.refreshTokenEncrypted;
    if (!refreshTokenEncrypted) return fail("refresh_token_missing");

    const quotaLimit = safeBytes(about.storageQuota?.limit);
    const quotaUsage = safeBytes(about.storageQuota?.usage);
    const quotaUsageInDrive = safeBytes(about.storageQuota?.usageInDrive);
    const quotaUsageInDriveTrash = safeBytes(about.storageQuota?.usageInDriveTrash);

    if (old) {
      await db.update(linkedAccounts).set({
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
        mode,
        refreshTokenEncrypted,
        storageFolderId: folderId,
        quotaLimit,
        quotaUsage,
        quotaUsageInDrive,
        quotaUsageInDriveTrash,
        status: "healthy",
        updatedAt: new Date(),
      }).where(eq(linkedAccounts.id, old.id));
    } else {
      await db.insert(linkedAccounts).values({
        id: nanoid(),
        userId,
        googleSubject: profile.sub,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
        mode,
        refreshTokenEncrypted,
        storageFolderId: folderId,
        quotaLimit,
        quotaUsage,
        quotaUsageInDrive,
        quotaUsageInDriveTrash,
      });
    }

    const saved = (await db.select({ id: linkedAccounts.id }).from(linkedAccounts).where(and(
      eq(linkedAccounts.userId, userId),
      eq(linkedAccounts.googleSubject, profile.sub),
    )).limit(1))[0];
    const destination = new URL("/accounts", request.url);
    destination.searchParams.set("connected", "1");
    if (mode === "full" && saved) destination.searchParams.set("sync", saved.id);

    const response = NextResponse.redirect(destination);
    response.cookies.set("meshly_session", await createSessionToken(userId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    for (const name of ["meshly_oauth_state", "meshly_oauth_verifier", "meshly_oauth_mode", "meshly_oauth_target"]) response.cookies.set(name, "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("OAuth callback failed", error);
    return fail("oauth_callback_failed");
  }
}

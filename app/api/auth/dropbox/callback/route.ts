import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { providerAccounts } from "@/db/provider-schema";
import { exchangeDropboxCode, getDropboxProfile, getDropboxSpaceUsage } from "@/lib/providers/dropbox";
import { encryptSecret, verifySessionToken } from "@/lib/security/crypto";

export async function GET(request: NextRequest) {
  const fail = (reason: string) => NextResponse.redirect(new URL(`/clouds?error=${encodeURIComponent(reason)}`, request.url));
  try {
    const session = request.cookies.get("meshly_session")?.value;
    if (!session) return fail("session_required");
    const { userId } = await verifySessionToken(session);
    const code = request.nextUrl.searchParams.get("code");
    const returnedState = request.nextUrl.searchParams.get("state");
    const state = request.cookies.get("meshly_dropbox_state")?.value;
    if (!code || !state || returnedState !== state) return fail("dropbox_state_invalid");

    const token = await exchangeDropboxCode(code);
    const [profile, usage] = await Promise.all([
      getDropboxProfile(token.access_token),
      getDropboxSpaceUsage(token.access_token),
    ]);
    const db = getDb();
    const globallyLinked = (await db.select().from(providerAccounts).where(and(
      eq(providerAccounts.provider, "dropbox"),
      eq(providerAccounts.externalAccountId, profile.account_id),
    )).limit(1))[0];
    if (globallyLinked && globallyLinked.userId !== userId) return fail("dropbox_account_already_linked");

    const quotaUsage = Number.isSafeInteger(usage.used) ? usage.used : 0;
    const allocated = Number(usage.allocation?.allocated ?? 0);
    const quotaLimit = Number.isSafeInteger(allocated) ? allocated : 0;
    const expiresAt = new Date(Date.now() + Math.max(60, token.expires_in ?? 14_400) * 1000);
    const values = {
      userId,
      provider: "dropbox",
      externalAccountId: profile.account_id,
      email: profile.email ?? null,
      name: profile.name?.display_name ?? null,
      avatarUrl: profile.profile_photo_url ?? null,
      accessTokenEncrypted: encryptSecret(token.access_token),
      refreshTokenEncrypted: token.refresh_token ? encryptSecret(token.refresh_token) : globallyLinked?.refreshTokenEncrypted ?? null,
      tokenExpiresAt: expiresAt,
      quotaLimit,
      quotaUsage,
      status: "healthy",
      metadata: { scopes: token.scope?.split(" ").filter(Boolean) ?? [] },
      updatedAt: new Date(),
    };

    if (globallyLinked) {
      await db.update(providerAccounts).set(values).where(eq(providerAccounts.id, globallyLinked.id));
    } else {
      if (!values.refreshTokenEncrypted) return fail("dropbox_refresh_token_missing");
      await db.insert(providerAccounts).values({ id: nanoid(), ...values });
    }

    const destination = new URL("/clouds", request.url);
    destination.searchParams.set("connected", "dropbox");
    const response = NextResponse.redirect(destination);
    response.cookies.set("meshly_dropbox_state", "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("Dropbox OAuth callback failed", error);
    return fail("dropbox_callback_failed");
  }
}

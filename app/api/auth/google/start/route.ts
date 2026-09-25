import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { linkedAccounts } from "@/db/schema";
import { buildGoogleAuthorizationUrl, createPkce, type GoogleMode } from "@/lib/google/oauth";
import { verifySessionToken } from "@/lib/security/crypto";

export async function GET(request: NextRequest) {
  try {
    const mode: GoogleMode = request.nextUrl.searchParams.get("mode") === "full" ? "full" : "managed";
    const targetAccountId = request.nextUrl.searchParams.get("accountId");
    let loginHint: string | undefined;
    let target: string | undefined;

    if (targetAccountId) {
      const session = request.cookies.get("meshly_session")?.value;
      if (!session) return NextResponse.redirect(new URL("/login?error=session_required", request.url));
      const { userId } = await verifySessionToken(session);
      const account = (await getDb().select().from(linkedAccounts).where(and(eq(linkedAccounts.id, targetAccountId), eq(linkedAccounts.userId, userId))).limit(1))[0];
      if (!account) return NextResponse.redirect(new URL("/accounts?error=account_not_found", request.url));
      loginHint = account.email;
      target = account.id;
    }

    const state = randomBytes(24).toString("base64url");
    const { verifier, challenge } = createPkce();
    const response = NextResponse.redirect(buildGoogleAuthorizationUrl({ state, challenge, mode, loginHint }));
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
    response.cookies.set("meshly_oauth_state", state, options);
    response.cookies.set("meshly_oauth_verifier", verifier, options);
    response.cookies.set("meshly_oauth_mode", mode, options);
    if (target) response.cookies.set("meshly_oauth_target", target, options);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth_not_configured", request.url));
  }
}

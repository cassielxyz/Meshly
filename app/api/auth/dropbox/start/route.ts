import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildDropboxAuthorizationUrl } from "@/lib/providers/dropbox";
import { verifySessionToken } from "@/lib/security/crypto";

export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get("meshly_session")?.value;
    if (!session) return NextResponse.redirect(new URL("/login?error=session_required", request.url));
    await verifySessionToken(session);

    const state = randomBytes(24).toString("base64url");
    const response = NextResponse.redirect(buildDropboxAuthorizationUrl(state));
    response.cookies.set("meshly_dropbox_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    console.error("Dropbox OAuth start failed", error);
    return NextResponse.redirect(new URL("/clouds?error=dropbox_not_configured", request.url));
  }
}

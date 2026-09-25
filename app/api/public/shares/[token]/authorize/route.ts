import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { shareAuthAttempts, shares } from "@/db/schema";
import { createShareGrant, hashShareAttemptKey, hashShareToken, verifySharePassword } from "@/lib/security/share";

const schema = z.object({ password: z.string().max(128).default("") });
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const input = schema.parse(await request.json());
  const db = getDb();
  const share = (await db.select().from(shares).where(eq(shares.tokenHash, hashShareToken(token))).limit(1))[0];
  if (!share || share.revokedAt || (share.expiresAt && share.expiresAt.getTime() < Date.now())) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (share.passwordHash) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const userAgent = (request.headers.get("user-agent") || "unknown").slice(0, 240);
    const key = hashShareAttemptKey(share.id, `${ip}|${userAgent}`);
    const cutoff = new Date(Date.now() - WINDOW_MS);
    const active = (await db.select().from(shareAuthAttempts).where(and(eq(shareAuthAttempts.key, key), gte(shareAuthAttempts.windowStartedAt, cutoff))).limit(1))[0];
    if (active && active.attempts >= MAX_ATTEMPTS) return NextResponse.json({ error: "too_many_attempts" }, { status: 429, headers: { "Retry-After": "900" } });

    if (!verifySharePassword(input.password, share.passwordHash)) {
      if (active) await db.update(shareAuthAttempts).set({ attempts: active.attempts + 1 }).where(eq(shareAuthAttempts.key, key));
      else await db.insert(shareAuthAttempts).values({ key, shareId: share.id, attempts: 1, windowStartedAt: new Date() }).onConflictDoUpdate({ target: shareAuthAttempts.key, set: { attempts: 1, windowStartedAt: new Date() } });
      return NextResponse.json({ error: "invalid_password" }, { status: 403 });
    }
    await db.delete(shareAuthAttempts).where(eq(shareAuthAttempts.key, key));
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("meshly_share_access", createShareGrant(share.id), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: `/api/public/shares/${token}`, maxAge: 900 });
  return response;
}

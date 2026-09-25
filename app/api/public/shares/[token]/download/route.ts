import { NextRequest } from "next/server";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { shares } from "@/db/schema";
import { createShareGrant, hashShareToken, verifyShareGrant } from "@/lib/security/share";
import { streamLogicalFile } from "@/lib/storage/download";

function cookieLine(name: string, value: string, path: string) {
  return `${name}=${value}; Path=${path}; Max-Age=3600; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const share = (await db.select().from(shares).where(eq(shares.tokenHash, hashShareToken(token))).limit(1))[0];
  if (!share || share.revokedAt || (share.expiresAt && share.expiresAt.getTime() < Date.now())) return new Response("Not found", { status: 404 });
  if (share.passwordHash && !verifyShareGrant(request.cookies.get("meshly_share_access")?.value, share.id)) return new Response("Password required", { status: 403 });

  const downloadCookie = request.cookies.get("meshly_share_download")?.value;
  const alreadyCounted = verifyShareGrant(downloadCookie, share.id);
  if (!alreadyCounted) {
    const updated = await db.update(shares).set({ downloadCount: sql`${shares.downloadCount} + 1` }).where(and(
      eq(shares.id, share.id),
      isNull(shares.revokedAt),
      or(isNull(shares.maxDownloads), lt(shares.downloadCount, shares.maxDownloads)),
    )).returning({ count: shares.downloadCount });
    if (!updated.length) return new Response("Download limit reached", { status: 410 });
  }

  const response = await streamLogicalFile(share.fileId, request.headers.get("range"));
  if (!alreadyCounted && response.status < 400) {
    response.headers.append("Set-Cookie", cookieLine("meshly_share_download", createShareGrant(share.id, 3600), `/api/public/shares/${token}/download`));
  }
  return response;
}

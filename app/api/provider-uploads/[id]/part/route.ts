import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { providerAccounts, providerObjects } from "@/db/provider-schema";
import { logicalFiles } from "@/db/schema";
import { appendDropboxUploadSession, getDropboxAccessToken, isDropboxManagedUploadsEnabled } from "@/lib/providers/dropbox";
import { decryptSecret } from "@/lib/security/crypto";
import { AuthError, requireRequestUser } from "@/lib/server/auth";

const MAX_PROXY_CHUNK_BYTES = 3 * 1024 * 1024;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isDropboxManagedUploadsEnabled()) return NextResponse.json({ error: "dropbox_managed_uploads_not_enabled" }, { status: 503 });
    const { userId } = await requireRequestUser(request);
    const { id } = await params;
    const offset = Number(request.nextUrl.searchParams.get("offset"));
    if (!Number.isSafeInteger(offset) || offset < 0) return NextResponse.json({ error: "invalid_offset" }, { status: 400 });

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_PROXY_CHUNK_BYTES) return NextResponse.json({ error: "provider_proxy_chunk_too_large", maxBytes: MAX_PROXY_CHUNK_BYTES }, { status: 413 });
    const body = new Uint8Array(await request.arrayBuffer());
    if (!body.byteLength || body.byteLength > MAX_PROXY_CHUNK_BYTES) return NextResponse.json({ error: "invalid_provider_proxy_chunk", maxBytes: MAX_PROXY_CHUNK_BYTES }, { status: 400 });

    const db = getDb();
    const row = (await db.select({ object: providerObjects, account: providerAccounts, file: logicalFiles })
      .from(providerObjects)
      .innerJoin(providerAccounts, eq(providerObjects.providerAccountId, providerAccounts.id))
      .innerJoin(logicalFiles, eq(providerObjects.fileId, logicalFiles.id))
      .where(and(eq(providerObjects.id, id), eq(providerAccounts.userId, userId), eq(logicalFiles.userId, userId)))
      .limit(1))[0];
    if (!row) return NextResponse.json({ error: "provider_object_not_found" }, { status: 404 });
    if (row.object.provider !== "dropbox" || row.account.provider !== "dropbox") return NextResponse.json({ error: "provider_not_supported" }, { status: 409 });
    if (row.object.status !== "uploading" || row.file.status !== "uploading") return NextResponse.json({ error: "provider_object_not_uploading" }, { status: 409 });
    if (!row.object.uploadSessionEncrypted) return NextResponse.json({ error: "provider_upload_session_missing" }, { status: 409 });
    if (offset !== row.object.uploadedBytes) return NextResponse.json({ error: "provider_offset_mismatch", expectedOffset: row.object.uploadedBytes }, { status: 409 });
    if (offset + body.byteLength > row.object.physicalSize) return NextResponse.json({ error: "provider_chunk_exceeds_object_size" }, { status: 400 });

    const accessToken = await getDropboxAccessToken(row.account);
    const sessionId = decryptSecret(row.object.uploadSessionEncrypted);
    const result = await appendDropboxUploadSession(accessToken, sessionId, offset, body);
    if (result.acceptedOffset < offset || result.acceptedOffset > row.object.physicalSize) {
      throw new Error("Dropbox returned an invalid accepted offset");
    }

    if (result.acceptedOffset > row.object.uploadedBytes) {
      await db.update(providerObjects).set({ uploadedBytes: result.acceptedOffset, updatedAt: new Date() }).where(eq(providerObjects.id, row.object.id));
    }

    const expectedEnd = offset + body.byteLength;
    if (result.acceptedOffset !== expectedEnd) {
      return NextResponse.json({ error: "provider_offset_reconciled", expectedOffset: result.acceptedOffset }, { status: 409, headers: { "cache-control": "no-store" } });
    }

    return NextResponse.json({ ok: true, acceptedOffset: result.acceptedOffset, reconciled: result.reconciled }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Dropbox encrypted upload part failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "provider_upload_part_failed" }, { status: 502 });
  }
}

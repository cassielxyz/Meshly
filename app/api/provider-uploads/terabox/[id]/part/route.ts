import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { providerAccounts, providerObjects } from "@/db/provider-schema";
import { logicalFiles } from "@/db/schema";
import {
  createTeraBoxFile,
  getTeraBoxFileMetadata,
  isTeraBoxManagedUploadsEnabled,
  precreateTeraBoxUpload,
  TERABOX_SERVERLESS_MAX_CIPHERTEXT_BYTES,
  uploadTeraBoxShard,
} from "@/lib/providers/terabox";
import { AuthError, requireRequestUser } from "@/lib/server/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isTeraBoxManagedUploadsEnabled()) return NextResponse.json({ error: "terabox_managed_uploads_not_enabled" }, { status: 503 });
    const { userId } = await requireRequestUser(request);
    const { id } = await params;
    const db = getDb();
    const row = (await db.select({ object: providerObjects, account: providerAccounts, file: logicalFiles })
      .from(providerObjects)
      .innerJoin(providerAccounts, eq(providerObjects.providerAccountId, providerAccounts.id))
      .innerJoin(logicalFiles, eq(providerObjects.fileId, logicalFiles.id))
      .where(and(eq(providerObjects.id, id), eq(providerAccounts.userId, userId), eq(logicalFiles.userId, userId)))
      .limit(1))[0];
    if (!row) return NextResponse.json({ error: "provider_object_not_found" }, { status: 404 });
    if (row.object.provider !== "terabox" || row.account.provider !== "terabox") return NextResponse.json({ error: "provider_not_supported" }, { status: 409 });
    if (row.object.status === "uploaded" || row.object.status === "ready") {
      return NextResponse.json({ ok: true, uploadedBytes: row.object.physicalSize, alreadyUploaded: true });
    }
    if (row.object.status !== "uploading" || row.file.status !== "uploading" || !row.object.remotePath) {
      return NextResponse.json({ error: "provider_object_not_uploadable" }, { status: 409 });
    }
    if (row.object.physicalSize > TERABOX_SERVERLESS_MAX_CIPHERTEXT_BYTES) {
      return NextResponse.json({ error: "terabox_serverless_small_file_limit" }, { status: 413 });
    }

    const raw = new Uint8Array(await request.arrayBuffer());
    if (raw.byteLength !== row.object.physicalSize) {
      return NextResponse.json({ error: "ciphertext_size_mismatch", expected: row.object.physicalSize, received: raw.byteLength }, { status: 400 });
    }
    const md5 = createHash("md5").update(raw).digest("hex");

    const existing = await getTeraBoxFileMetadata(row.account, row.object.remotePath, false);
    if (existing.metadata && Number(existing.metadata.size) === row.object.physicalSize) {
      await db.update(providerObjects).set({
        remoteId: String(existing.metadata.fs_id),
        uploadedBytes: row.object.physicalSize,
        status: "uploaded",
        metadata: { ...row.object.metadata, blockMd5: [md5], remoteMd5: existing.metadata.md5 ?? null, recoveredExistingObject: true },
        updatedAt: new Date(),
      }).where(eq(providerObjects.id, row.object.id));
      return NextResponse.json({ ok: true, uploadedBytes: row.object.physicalSize, recoveredExistingObject: true });
    }

    const precreated = await precreateTeraBoxUpload(row.account, row.object.remotePath, [md5]);
    if (!precreated.uploadid) return NextResponse.json({ error: "terabox_upload_id_missing" }, { status: 502 });
    const shard = await uploadTeraBoxShard(row.account, { path: row.object.remotePath, uploadId: precreated.uploadid, part: 0, bytes: raw });
    if (shard.md5?.toLowerCase() !== md5.toLowerCase()) {
      return NextResponse.json({ error: "terabox_shard_md5_mismatch" }, { status: 409 });
    }
    const created = await createTeraBoxFile(row.account, { path: row.object.remotePath, size: row.object.physicalSize, uploadId: precreated.uploadid, blockMd5: [md5] });
    const verified = await getTeraBoxFileMetadata(row.account, created.path ?? row.object.remotePath, false);
    if (!verified.metadata || Number(verified.metadata.size) !== row.object.physicalSize) {
      return NextResponse.json({ error: "terabox_remote_object_verification_failed" }, { status: 409 });
    }

    await db.update(providerObjects).set({
      remoteId: String(verified.metadata.fs_id),
      remotePath: created.path ?? row.object.remotePath,
      uploadedBytes: row.object.physicalSize,
      status: "uploaded",
      metadata: { ...row.object.metadata, blockMd5: [md5], remoteMd5: verified.metadata.md5 ?? created.md5 ?? null },
      updatedAt: new Date(),
    }).where(eq(providerObjects.id, row.object.id));
    return NextResponse.json({ ok: true, uploadedBytes: row.object.physicalSize });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("TeraBox encrypted object upload failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "terabox_upload_failed" }, { status: 502 });
  }
}

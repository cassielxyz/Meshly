import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { providerAccounts, providerObjects } from "@/db/provider-schema";
import { logicalFiles } from "@/db/schema";
import { createTeraBoxFile, getTeraBoxFileMetadata } from "@/lib/providers/terabox";
import { isTeraBoxLargeWorkerEnabled, requireTeraBoxWorkerInternalAuthorization } from "@/lib/providers/terabox-worker";

const schema = z.object({
  uploadId: z.string().min(1).max(1024),
  blockMd5: z.array(z.string().regex(/^[a-f0-9]{32}$/i)).min(1).max(10000),
  ciphertextMd5: z.string().regex(/^[a-f0-9]{32}$/i),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isTeraBoxLargeWorkerEnabled()) return NextResponse.json({ error: "terabox_large_worker_not_enabled" }, { status: 503 });
    if (!requireTeraBoxWorkerInternalAuthorization(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "unauthorized_worker" }, { status: 401 });
    }
    const input = schema.parse(await request.json());
    const { id } = await params;
    const db = getDb();
    const row = (await db.select({ object: providerObjects, account: providerAccounts, file: logicalFiles })
      .from(providerObjects)
      .innerJoin(providerAccounts, eq(providerObjects.providerAccountId, providerAccounts.id))
      .innerJoin(logicalFiles, eq(providerObjects.fileId, logicalFiles.id))
      .where(eq(providerObjects.id, id))
      .limit(1))[0];
    if (!row) return NextResponse.json({ error: "provider_object_not_found" }, { status: 404 });
    if (row.object.provider !== "terabox" || row.account.provider !== "terabox") return NextResponse.json({ error: "provider_not_supported" }, { status: 409 });
    if (!row.object.remotePath || row.file.status !== "uploading") return NextResponse.json({ error: "provider_object_not_uploadable" }, { status: 409 });
    if (row.object.status === "uploaded") return NextResponse.json({ ok: true, alreadyUploaded: true, uploadedBytes: row.object.uploadedBytes });
    if (row.object.status !== "uploading") return NextResponse.json({ error: "provider_object_not_uploadable" }, { status: 409 });

    const metadata = (row.object.metadata ?? {}) as Record<string, unknown>;
    const expectedFrames = Number(metadata.workerFrames);
    if (metadata.transport !== "terabox-worker-v1" || expectedFrames !== input.blockMd5.length || metadata.workerUploadId !== input.uploadId) {
      return NextResponse.json({ error: "terabox_worker_finish_binding_mismatch" }, { status: 409 });
    }
    const preparedBlocks = Array.isArray(metadata.blockMd5) ? metadata.blockMd5.map(String) : [];
    if (preparedBlocks.length !== input.blockMd5.length || preparedBlocks.some((value, index) => value.toLowerCase() !== input.blockMd5[index]!.toLowerCase())) {
      return NextResponse.json({ error: "terabox_worker_block_list_mismatch" }, { status: 409 });
    }
    if (typeof metadata.ciphertextMd5 !== "string" || metadata.ciphertextMd5.toLowerCase() !== input.ciphertextMd5.toLowerCase()) {
      return NextResponse.json({ error: "terabox_worker_ciphertext_md5_mismatch" }, { status: 409 });
    }

    const created = await createTeraBoxFile(row.account, {
      path: row.object.remotePath,
      size: row.object.physicalSize,
      uploadId: input.uploadId,
      blockMd5: input.blockMd5.map((value) => value.toLowerCase()),
    });
    const remotePath = created.path ?? row.object.remotePath;
    const verified = await getTeraBoxFileMetadata(row.account, remotePath, false);
    if (!verified.metadata || Number(verified.metadata.size) !== row.object.physicalSize) {
      return NextResponse.json({ error: "terabox_remote_object_verification_failed" }, { status: 409 });
    }
    if (verified.metadata.md5 && verified.metadata.md5.toLowerCase() !== input.ciphertextMd5.toLowerCase()) {
      return NextResponse.json({ error: "terabox_remote_object_md5_mismatch" }, { status: 409 });
    }

    await db.update(providerObjects).set({
      remoteId: String(verified.metadata.fs_id),
      remotePath,
      uploadedBytes: row.object.physicalSize,
      status: "uploaded",
      metadata: {
        ...metadata,
        blockMd5: input.blockMd5.map((value) => value.toLowerCase()),
        ciphertextMd5: input.ciphertextMd5.toLowerCase(),
        remoteMd5: verified.metadata.md5 ?? created.md5 ?? null,
        workerFinishedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    }).where(eq(providerObjects.id, row.object.id));
    return NextResponse.json({ ok: true, uploadedBytes: row.object.physicalSize });
  } catch (error) {
    console.error("TeraBox worker finish failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "terabox_worker_finish_failed" }, { status: 400 });
  }
}

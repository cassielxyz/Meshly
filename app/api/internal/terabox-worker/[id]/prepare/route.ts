import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { providerAccounts, providerObjects } from "@/db/provider-schema";
import { logicalFiles } from "@/db/schema";
import { getTeraBoxFileMetadata, getTeraBoxShardUploadUrl, precreateTeraBoxUpload } from "@/lib/providers/terabox";
import { isTeraBoxLargeWorkerEnabled, requireTeraBoxWorkerInternalAuthorization } from "@/lib/providers/terabox-worker";

const schema = z.object({
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

    const metadata = (row.object.metadata ?? {}) as Record<string, unknown>;
    const expectedFrames = Number(metadata.workerFrames);
    if (metadata.transport !== "terabox-worker-v1" || !Number.isSafeInteger(expectedFrames) || expectedFrames < 1) {
      return NextResponse.json({ error: "provider_object_not_worker_managed" }, { status: 409 });
    }
    if (input.blockMd5.length !== expectedFrames) {
      return NextResponse.json({ error: "terabox_worker_part_count_mismatch", expected: expectedFrames, received: input.blockMd5.length }, { status: 400 });
    }
    if (!row.object.remotePath || row.file.status !== "uploading") return NextResponse.json({ error: "provider_object_not_uploadable" }, { status: 409 });

    if (row.object.status === "uploaded") {
      return NextResponse.json({ ok: true, alreadyUploaded: true, uploadedBytes: row.object.uploadedBytes });
    }
    if (row.object.status !== "uploading") return NextResponse.json({ error: "provider_object_not_uploadable" }, { status: 409 });

    const existing = await getTeraBoxFileMetadata(row.account, row.object.remotePath, false).catch(() => null);
    if (existing?.metadata && Number(existing.metadata.size) === row.object.physicalSize) {
      if (existing.metadata.md5 && existing.metadata.md5.toLowerCase() !== input.ciphertextMd5.toLowerCase()) {
        return NextResponse.json({ error: "terabox_existing_object_md5_mismatch" }, { status: 409 });
      }
      await db.update(providerObjects).set({
        remoteId: String(existing.metadata.fs_id),
        uploadedBytes: row.object.physicalSize,
        status: "uploaded",
        metadata: { ...metadata, blockMd5: input.blockMd5.map((value) => value.toLowerCase()), ciphertextMd5: input.ciphertextMd5.toLowerCase(), remoteMd5: existing.metadata.md5 ?? null, recoveredExistingObject: true },
        updatedAt: new Date(),
      }).where(eq(providerObjects.id, row.object.id));
      return NextResponse.json({ ok: true, alreadyUploaded: true, uploadedBytes: row.object.physicalSize });
    }

    const precreated = await precreateTeraBoxUpload(row.account, row.object.remotePath, input.blockMd5.map((value) => value.toLowerCase()));
    if (precreated.return_type === 2) {
      const completed = await getTeraBoxFileMetadata(row.account, row.object.remotePath, false).catch(() => null);
      if (!completed?.metadata || Number(completed.metadata.size) !== row.object.physicalSize) {
        return NextResponse.json({ error: "terabox_precreate_completed_object_not_verifiable" }, { status: 409 });
      }
      if (completed.metadata.md5 && completed.metadata.md5.toLowerCase() !== input.ciphertextMd5.toLowerCase()) {
        return NextResponse.json({ error: "terabox_precreate_completed_md5_mismatch" }, { status: 409 });
      }
      await db.update(providerObjects).set({
        remoteId: String(completed.metadata.fs_id),
        uploadedBytes: row.object.physicalSize,
        status: "uploaded",
        metadata: { ...metadata, blockMd5: input.blockMd5.map((value) => value.toLowerCase()), ciphertextMd5: input.ciphertextMd5.toLowerCase(), remoteMd5: completed.metadata.md5 ?? null, recoveredExistingObject: true },
        updatedAt: new Date(),
      }).where(eq(providerObjects.id, row.object.id));
      return NextResponse.json({ ok: true, alreadyUploaded: true, uploadedBytes: row.object.physicalSize });
    }
    if (!precreated.uploadid) return NextResponse.json({ error: "terabox_upload_id_missing" }, { status: 502 });

    const firstUrl = await getTeraBoxShardUploadUrl(row.account, { path: row.object.remotePath, uploadId: precreated.uploadid, part: 0 });
    const partUrls = input.blockMd5.map((_, part) => {
      const url = new URL(firstUrl);
      url.searchParams.set("partseq", String(part));
      return url.toString();
    });
    await db.update(providerObjects).set({
      metadata: { ...metadata, workerUploadId: precreated.uploadid, blockMd5: input.blockMd5.map((value) => value.toLowerCase()), ciphertextMd5: input.ciphertextMd5.toLowerCase() },
      updatedAt: new Date(),
    }).where(eq(providerObjects.id, row.object.id));

    return NextResponse.json({ ok: true, uploadId: precreated.uploadid, partUrls }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("TeraBox worker prepare failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "terabox_worker_prepare_failed" }, { status: 400 });
  }
}

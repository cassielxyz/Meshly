import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import { providerAccounts, providerObjects } from "@/db/provider-schema";
import { activities, logicalFiles } from "@/db/schema";
import { getTeraBoxFileMetadata, isTeraBoxManagedUploadsEnabled, refreshTeraBoxAccount } from "@/lib/providers/terabox";
import { AuthError, requireRequestUser } from "@/lib/server/auth";
import { writeRecoverySnapshot } from "@/lib/storage/recovery";

const schema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  ciphertextSha256: z.string().regex(/^[a-f0-9]{64}$/i),
});

function expectedRemoteMd5(metadata: Record<string, unknown>) {
  if (typeof metadata.remoteMd5 === "string") return metadata.remoteMd5.toLowerCase();
  const blockMd5 = metadata.blockMd5;
  if (Array.isArray(blockMd5) && blockMd5.length === 1 && typeof blockMd5[0] === "string") return blockMd5[0].toLowerCase();
  return null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isTeraBoxManagedUploadsEnabled()) return NextResponse.json({ error: "terabox_managed_uploads_not_enabled" }, { status: 503 });
    const { userId } = await requireRequestUser(request);
    const { id } = await params;
    const input = schema.parse(await request.json());
    const db = getDb();
    const row = (await db.select({ object: providerObjects, account: providerAccounts, file: logicalFiles })
      .from(providerObjects)
      .innerJoin(providerAccounts, eq(providerObjects.providerAccountId, providerAccounts.id))
      .innerJoin(logicalFiles, eq(providerObjects.fileId, logicalFiles.id))
      .where(and(eq(providerObjects.id, id), eq(providerAccounts.userId, userId), eq(logicalFiles.userId, userId)))
      .limit(1))[0];
    if (!row) return NextResponse.json({ error: "provider_object_not_found" }, { status: 404 });
    if (row.object.provider !== "terabox" || row.account.provider !== "terabox") return NextResponse.json({ error: "provider_not_supported" }, { status: 409 });

    if (row.object.status === "ready" && row.file.status === "ready") {
      const samePlain = row.file.sha256?.toLowerCase() === input.sha256.toLowerCase();
      const sameCipher = row.object.ciphertextSha256?.toLowerCase() === input.ciphertextSha256.toLowerCase();
      if (samePlain && sameCipher) return NextResponse.json({ ok: true, fileId: row.file.id, downloadUrl: `/api/files/${row.file.id}/download`, alreadyCommitted: true });
      return NextResponse.json({ error: "provider_object_already_committed" }, { status: 409 });
    }

    if (row.object.status !== "uploaded" || row.file.status !== "uploading" || !row.object.remotePath) {
      return NextResponse.json({ error: "provider_object_not_committable" }, { status: 409 });
    }
    if (row.object.uploadedBytes !== row.object.physicalSize) {
      return NextResponse.json({ error: "provider_upload_incomplete" }, { status: 409 });
    }
    const verified = await getTeraBoxFileMetadata(row.account, row.object.remotePath, false);
    if (!verified.metadata || Number(verified.metadata.size) !== row.object.physicalSize) {
      return NextResponse.json({ error: "remote_encrypted_object_verification_failed" }, { status: 409 });
    }

    const metadata = (row.object.metadata ?? {}) as Record<string, unknown>;
    const expectedMd5 = expectedRemoteMd5(metadata);
    const actualMd5 = verified.metadata.md5?.toLowerCase() ?? null;
    if (expectedMd5 && actualMd5 && expectedMd5 !== actualMd5) {
      return NextResponse.json({ error: "remote_encrypted_object_md5_mismatch" }, { status: 409 });
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.update(providerObjects).set({
        remoteId: String(verified.metadata!.fs_id),
        ciphertextSha256: input.ciphertextSha256.toLowerCase(),
        uploadedBytes: row.object.physicalSize,
        status: "ready",
        metadata: { ...metadata, remoteMd5: verified.metadata!.md5 ?? null, verifiedSize: row.object.physicalSize },
        updatedAt: now,
      }).where(eq(providerObjects.id, row.object.id));
      await tx.update(logicalFiles).set({ sha256: input.sha256.toLowerCase(), status: "ready", updatedAt: now }).where(eq(logicalFiles.id, row.file.id));
      await tx.insert(activities).values({
        id: nanoid(),
        userId,
        kind: "encrypted_terabox_upload_completed",
        subjectId: row.file.id,
        metadata: { name: row.file.name, logicalSize: row.file.size, physicalSize: row.object.physicalSize, encryptionVersion: 1, provider: "terabox" },
      });
    });

    void refreshTeraBoxAccount(row.account).catch(() => undefined);
    let recovery: { written: number; failures: string[] } | null = null;
    try {
      recovery = await writeRecoverySnapshot(userId);
    } catch (error) {
      console.error("Post-TeraBox-upload recovery snapshot failed", error);
    }
    return NextResponse.json({ ok: true, fileId: row.file.id, downloadUrl: `/api/files/${row.file.id}/download`, recovery }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("TeraBox encrypted upload commit failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "terabox_upload_commit_failed" }, { status: 400 });
  }
}

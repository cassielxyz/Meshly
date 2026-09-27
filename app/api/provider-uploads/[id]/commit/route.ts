import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import { providerAccounts, providerObjects } from "@/db/provider-schema";
import { activities, logicalFiles } from "@/db/schema";
import {
  finishDropboxUploadSession,
  getDropboxAccessToken,
  isDropboxManagedUploadsEnabled,
  refreshDropboxAccount,
  tryGetDropboxMetadata,
} from "@/lib/providers/dropbox";
import { decryptSecret } from "@/lib/security/crypto";
import { AuthError, requireRequestUser } from "@/lib/server/auth";
import { writeRecoverySnapshot } from "@/lib/storage/recovery";

const schema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  ciphertextSha256: z.string().regex(/^[a-f0-9]{64}$/i),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isDropboxManagedUploadsEnabled()) return NextResponse.json({ error: "dropbox_managed_uploads_not_enabled" }, { status: 503 });
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
    if (row.object.provider !== "dropbox" || row.account.provider !== "dropbox") return NextResponse.json({ error: "provider_not_supported" }, { status: 409 });

    if (row.object.status === "ready" && row.file.status === "ready") {
      const samePlain = row.file.sha256?.toLowerCase() === input.sha256.toLowerCase();
      const sameCipher = row.object.ciphertextSha256?.toLowerCase() === input.ciphertextSha256.toLowerCase();
      if (samePlain && sameCipher) return NextResponse.json({ ok: true, fileId: row.file.id, downloadUrl: `/api/files/${row.file.id}/download`, alreadyCommitted: true });
      return NextResponse.json({ error: "provider_object_already_committed" }, { status: 409 });
    }

    if (row.object.status !== "uploading" || row.file.status !== "uploading") return NextResponse.json({ error: "provider_object_not_committable" }, { status: 409 });
    if (row.object.uploadedBytes !== row.object.physicalSize) {
      return NextResponse.json({ error: "provider_upload_incomplete", expectedOffset: row.object.uploadedBytes, physicalSize: row.object.physicalSize }, { status: 409 });
    }
    if (!row.object.remotePath || !row.object.uploadSessionEncrypted) return NextResponse.json({ error: "provider_upload_metadata_missing" }, { status: 409 });

    const accessToken = await getDropboxAccessToken(row.account);
    let remote = await tryGetDropboxMetadata(accessToken, row.object.remotePath);
    if (!remote) {
      const sessionId = decryptSecret(row.object.uploadSessionEncrypted);
      remote = await finishDropboxUploadSession(accessToken, sessionId, row.object.physicalSize, row.object.remotePath);
    }
    if (remote[".tag"] !== "file" || !remote.id || Number(remote.size ?? -1) !== row.object.physicalSize) {
      return NextResponse.json({ error: "remote_encrypted_object_verification_failed" }, { status: 409 });
    }

    const remotePath = remote.path_display ?? row.object.remotePath;
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.update(providerObjects).set({
        remoteId: remote.id ?? null,
        remotePath,
        ciphertextSha256: input.ciphertextSha256.toLowerCase(),
        uploadSessionEncrypted: null,
        uploadedBytes: row.object.physicalSize,
        status: "ready",
        metadata: {
          ...row.object.metadata,
          dropboxContentHash: remote.content_hash ?? null,
          verifiedSize: row.object.physicalSize,
        },
        updatedAt: now,
      }).where(eq(providerObjects.id, row.object.id));
      await tx.update(logicalFiles).set({ sha256: input.sha256.toLowerCase(), status: "ready", updatedAt: now }).where(eq(logicalFiles.id, row.file.id));
      await tx.insert(activities).values({
        id: nanoid(),
        userId,
        kind: "encrypted_dropbox_upload_completed",
        subjectId: row.file.id,
        metadata: { name: row.file.name, logicalSize: row.file.size, physicalSize: row.object.physicalSize, encryptionVersion: 1, provider: "dropbox" },
      });
    });

    void refreshDropboxAccount(row.account).catch(() => undefined);
    let recovery: { written: number; failures: string[] } | null = null;
    try {
      recovery = await writeRecoverySnapshot(userId);
    } catch (error) {
      console.error("Post-Dropbox-upload recovery snapshot failed", error);
    }

    return NextResponse.json({ ok: true, fileId: row.file.id, downloadUrl: `/api/files/${row.file.id}/download`, recovery }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Dropbox encrypted upload commit failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "provider_upload_commit_failed" }, { status: 400 });
  }
}

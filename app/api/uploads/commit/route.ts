import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import { activities, chunks, linkedAccounts, logicalFiles } from "@/db/schema";
import { getDriveFileMetadata } from "@/lib/google/drive";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";
import { decryptSecret } from "@/lib/security/crypto";
import { AuthError, requireRequestUser } from "@/lib/server/auth";
import { writeRecoverySnapshot } from "@/lib/storage/recovery";

const schema = z.object({
  fileId: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  chunks: z.array(z.object({
    chunkId: z.string().min(1),
    driveFileId: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  })).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireRequestUser(request);
    const input = schema.parse(await request.json());
    const db = getDb();
    const file = (await db.select().from(logicalFiles).where(and(eq(logicalFiles.id, input.fileId), eq(logicalFiles.userId, userId))).limit(1))[0];
    if (!file) return NextResponse.json({ error: "file_not_found" }, { status: 404 });
    if (file.status === "ready" && file.sha256?.toLowerCase() === input.sha256.toLowerCase()) return NextResponse.json({ ok: true, fileId: file.id, downloadUrl: `/api/files/${file.id}/download`, alreadyCommitted: true });
    if (file.status !== "uploading") return NextResponse.json({ error: "file_not_committable" }, { status: 409 });

    const stored = await db.select().from(chunks).where(eq(chunks.fileId, file.id));
    if (stored.length !== input.chunks.length) return NextResponse.json({ error: "chunk_count_mismatch" }, { status: 409 });

    for (const submitted of input.chunks) {
      const chunk = stored.find((candidate) => candidate.id === submitted.chunkId);
      if (!chunk) return NextResponse.json({ error: "unknown_chunk" }, { status: 409 });
      if (chunk.status === "ready" && chunk.driveFileId === submitted.driveFileId && chunk.sha256?.toLowerCase() === submitted.sha256.toLowerCase()) continue;
      const account = (await db.select().from(linkedAccounts).where(and(eq(linkedAccounts.id, chunk.accountId), eq(linkedAccounts.userId, userId))).limit(1))[0];
      if (!account) throw new Error("Storage account missing");
      const access = await refreshGoogleAccessToken(decryptSecret(account.refreshTokenEncrypted));
      const remote = await getDriveFileMetadata(access, submitted.driveFileId);
      const app = remote.appProperties ?? {};
      const bound = app.meshlyFileId === file.id && app.meshlyChunkId === chunk.id && app.meshlyPart === String(chunk.part);
      const checksumMatches = !remote.sha256Checksum || remote.sha256Checksum.toLowerCase() === submitted.sha256.toLowerCase();
      if (!bound || !checksumMatches || remote.trashed || Number(remote.size ?? -1) !== chunk.size) return NextResponse.json({ error: "remote_chunk_verification_failed", chunkId: chunk.id }, { status: 409 });
      await db.update(chunks).set({ driveFileId: submitted.driveFileId, sha256: submitted.sha256.toLowerCase(), status: "ready" }).where(eq(chunks.id, chunk.id));
    }

    await db.update(logicalFiles).set({ sha256: input.sha256.toLowerCase(), status: "ready", updatedAt: new Date() }).where(eq(logicalFiles.id, file.id));
    await db.insert(activities).values({ id: nanoid(), userId, kind: "upload_completed", subjectId: file.id, metadata: { name: file.name, size: file.size, chunks: stored.length } });
    let recovery: { written: number; failures: string[] } | null = null;
    try {
      recovery = await writeRecoverySnapshot(userId);
    } catch (error) {
      console.error("Post-upload recovery snapshot failed", error);
    }
    return NextResponse.json({ ok: true, fileId: file.id, downloadUrl: `/api/files/${file.id}/download`, recovery });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Upload commit failed", error);
    return NextResponse.json({ error: "commit_failed" }, { status: 400 });
  }
}

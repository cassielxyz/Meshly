import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import { activities, chunks, linkedAccounts, logicalFiles } from "@/db/schema";
import { deleteDriveFile, getDriveFileMetadata } from "@/lib/google/drive";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";
import { decryptSecret } from "@/lib/security/crypto";
import { AuthError, requireRequestUser } from "@/lib/server/auth";

const schema = z.object({ completed: z.array(z.object({ chunkId: z.string().min(1), driveFileId: z.string().min(1) })).max(10000).default([]) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireRequestUser(request);
    const { id } = await params;
    const input = schema.parse(await request.json());
    const db = getDb();
    const file = (await db.select().from(logicalFiles).where(and(eq(logicalFiles.id, id), eq(logicalFiles.userId, userId))).limit(1))[0];
    if (!file) return NextResponse.json({ ok: true, alreadyGone: true });
    if (file.status === "ready") return NextResponse.json({ error: "committed_upload_cannot_be_aborted" }, { status: 409 });

    const stored = await db.select().from(chunks).where(eq(chunks.fileId, file.id));
    const accounts = new Map<string, typeof linkedAccounts.$inferSelect>();
    const tokens = new Map<string, string>();
    const failures: string[] = [];

    for (const submitted of input.completed) {
      const chunk = stored.find((candidate) => candidate.id === submitted.chunkId);
      if (!chunk) continue;
      let account = accounts.get(chunk.accountId);
      if (!account) {
        account = (await db.select().from(linkedAccounts).where(and(eq(linkedAccounts.id, chunk.accountId), eq(linkedAccounts.userId, userId))).limit(1))[0];
        if (!account) continue;
        accounts.set(account.id, account);
      }
      try {
        let access = tokens.get(account.id);
        if (!access) {
          access = await refreshGoogleAccessToken(decryptSecret(account.refreshTokenEncrypted));
          tokens.set(account.id, access);
        }
        const remote = await getDriveFileMetadata(access, submitted.driveFileId);
        const app = remote.appProperties ?? {};
        if (app.meshlyFileId !== file.id || app.meshlyChunkId !== chunk.id) {
          failures.push(`${chunk.id}: object binding mismatch`);
          continue;
        }
        await deleteDriveFile(access, submitted.driveFileId);
      } catch (error) {
        failures.push(`${chunk.id}: ${error instanceof Error ? error.message : "cleanup failed"}`);
      }
    }

    await db.delete(logicalFiles).where(and(eq(logicalFiles.id, file.id), eq(logicalFiles.userId, userId)));
    await db.insert(activities).values({ id: nanoid(), userId, kind: "upload_aborted", subjectId: file.id, metadata: { name: file.name, finalizedChunks: input.completed.length, cleanupFailures: failures.length } });
    return NextResponse.json({ ok: true, cleanupFailures: failures });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Upload abort failed", error);
    return NextResponse.json({ error: "abort_failed" }, { status: 400 });
  }
}

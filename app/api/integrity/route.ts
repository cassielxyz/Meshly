import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { activities, chunks, linkedAccounts, logicalFiles } from "@/db/schema";
import { getDriveFileMetadata } from "@/lib/google/drive";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";
import { decryptSecret } from "@/lib/security/crypto";
import { AuthError, requireRequestUser } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireRequestUser(request);
    const db = getDb();
    const files = await db.select().from(logicalFiles).where(eq(logicalFiles.userId, userId)).orderBy(desc(logicalFiles.updatedAt)).limit(500);
    const visible = files.filter((file) => file.mimeType !== "application/vnd.meshly.folder");
    return NextResponse.json({
      files: visible.map((file) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        status: file.status,
        sha256: file.sha256,
        encryptionVersion: file.encryptionVersion,
        updatedAt: file.updatedAt.toISOString(),
      })),
      degraded: visible.filter((file) => file.status !== "ready" && file.status !== "uploading").length,
      encryptedManaged: visible.filter((file) => file.sourceKind === "managed" && file.encryptionVersion === 1).length,
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "integrity_status_failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireRequestUser(request);
    const db = getDb();
    const files = await db.select({ id: logicalFiles.id, encryptionVersion: logicalFiles.encryptionVersion }).from(logicalFiles).where(and(eq(logicalFiles.userId, userId), eq(logicalFiles.status, "ready"))).limit(100);
    if (!files.length) return NextResponse.json({ checked: 0, degraded: 0 });
    const ids = files.map((file) => file.id);
    const fileEncryption = new Map(files.map((file) => [file.id, file.encryptionVersion]));
    const rows = await db.select({ chunk: chunks, account: linkedAccounts }).from(chunks).innerJoin(linkedAccounts, eq(chunks.accountId, linkedAccounts.id)).where(inArray(chunks.fileId, ids));
    const tokens = new Map<string, string>();
    const badFiles = new Set<string>();
    let checked = 0;

    for (const { chunk, account } of rows) {
      if (!chunk.driveFileId) {
        badFiles.add(chunk.fileId);
        await db.update(chunks).set({ status: "missing" }).where(eq(chunks.id, chunk.id));
        continue;
      }
      try {
        let access = tokens.get(account.id);
        if (!access) {
          access = await refreshGoogleAccessToken(decryptSecret(account.refreshTokenEncrypted));
          tokens.set(account.id, access);
        }
        const remote = await getDriveFileMetadata(access, chunk.driveFileId);
        checked++;
        const encrypted = fileEncryption.get(chunk.fileId) === 1;
        const expectedSize = encrypted ? chunk.physicalSize : chunk.size;
        const checksumMismatch = encrypted && chunk.ciphertextSha256 && remote.sha256Checksum
          ? remote.sha256Checksum.toLowerCase() !== chunk.ciphertextSha256.toLowerCase()
          : false;
        const sizeMismatch = expectedSize == null || Number(remote.size ?? -1) !== expectedSize;
        if (remote.trashed || sizeMismatch || checksumMismatch) {
          badFiles.add(chunk.fileId);
          await db.update(chunks).set({ status: remote.trashed ? "missing" : checksumMismatch ? "checksum_mismatch" : "size_mismatch" }).where(eq(chunks.id, chunk.id));
        }
      } catch {
        badFiles.add(chunk.fileId);
        await db.update(chunks).set({ status: "unverified" }).where(eq(chunks.id, chunk.id));
      }
    }

    for (const id of badFiles) await db.update(logicalFiles).set({ status: "degraded", updatedAt: new Date() }).where(eq(logicalFiles.id, id));
    await db.insert(activities).values({ id: nanoid(), userId, kind: "integrity_scan", metadata: { checked, degraded: badFiles.size, encryptedObjectAware: true } });
    return NextResponse.json({ checked, degraded: badFiles.size });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Integrity scan failed", error);
    return NextResponse.json({ error: "integrity_scan_failed" }, { status: 500 });
  }
}

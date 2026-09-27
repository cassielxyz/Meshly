import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { providerAccounts, providerObjects } from "@/db/provider-schema";
import { activities, chunks, linkedAccounts, logicalFiles } from "@/db/schema";
import { getDriveFileMetadata } from "@/lib/google/drive";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";
import { getDropboxAccessToken, getDropboxMetadata } from "@/lib/providers/dropbox";
import { decryptSecret } from "@/lib/security/crypto";
import { AuthError, requireRequestUser } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireRequestUser(request);
    const db = getDb();
    const files = await db.select().from(logicalFiles).where(eq(logicalFiles.userId, userId)).orderBy(desc(logicalFiles.updatedAt)).limit(500);
    const visible = files.filter((file) => file.mimeType !== "application/vnd.meshly.folder");
    const managedIds = visible.filter((file) => file.sourceKind === "managed").map((file) => file.id);
    const providerCount = managedIds.length
      ? (await db.select({ id: providerObjects.id }).from(providerObjects).where(inArray(providerObjects.fileId, managedIds))).length
      : 0;
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
      providerManaged: providerCount,
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
    if (!files.length) return NextResponse.json({ checked: 0, checkedProviderObjects: 0, degraded: 0 });
    const ids = files.map((file) => file.id);
    const fileEncryption = new Map(files.map((file) => [file.id, file.encryptionVersion]));
    const rows = await db.select({ chunk: chunks, account: linkedAccounts }).from(chunks).innerJoin(linkedAccounts, eq(chunks.accountId, linkedAccounts.id)).where(inArray(chunks.fileId, ids));
    const cloudRows = await db.select({ object: providerObjects, account: providerAccounts })
      .from(providerObjects)
      .innerJoin(providerAccounts, eq(providerObjects.providerAccountId, providerAccounts.id))
      .where(and(inArray(providerObjects.fileId, ids), eq(providerAccounts.userId, userId)));
    const tokens = new Map<string, string>();
    const dropboxTokens = new Map<string, string>();
    const badFiles = new Set<string>();
    let checked = 0;
    let checkedProviderObjects = 0;

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

    for (const { object, account } of cloudRows) {
      if (object.provider !== account.provider || object.status !== "ready" || !object.remotePath) {
        badFiles.add(object.fileId);
        await db.update(providerObjects).set({ status: "unverified", updatedAt: new Date() }).where(eq(providerObjects.id, object.id));
        continue;
      }
      try {
        if (object.provider !== "dropbox") throw new Error("Unsupported provider integrity check");
        let access = dropboxTokens.get(account.id);
        if (!access) {
          access = await getDropboxAccessToken(account);
          dropboxTokens.set(account.id, access);
        }
        const remote = await getDropboxMetadata(access, object.remotePath);
        checkedProviderObjects++;
        if (remote[".tag"] !== "file" || Number(remote.size ?? -1) !== object.physicalSize) {
          badFiles.add(object.fileId);
          await db.update(providerObjects).set({ status: "size_mismatch", updatedAt: new Date() }).where(eq(providerObjects.id, object.id));
        }
      } catch {
        badFiles.add(object.fileId);
        await db.update(providerObjects).set({ status: "unverified", updatedAt: new Date() }).where(eq(providerObjects.id, object.id));
      }
    }

    for (const id of badFiles) await db.update(logicalFiles).set({ status: "degraded", updatedAt: new Date() }).where(eq(logicalFiles.id, id));
    await db.insert(activities).values({
      id: nanoid(),
      userId,
      kind: "integrity_scan",
      metadata: { checked, checkedProviderObjects, degraded: badFiles.size, encryptedObjectAware: true, providerVerification: "remote-existence-and-size" },
    });
    return NextResponse.json({ checked, checkedProviderObjects, degraded: badFiles.size });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Integrity scan failed", error);
    return NextResponse.json({ error: "integrity_scan_failed" }, { status: 500 });
  }
}

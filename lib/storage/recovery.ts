import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import { activities, chunks, linkedAccounts, logicalFiles, syncState } from "@/db/schema";
import { readAppDataFile, upsertAppDataFile } from "@/lib/google/drive";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";
import { decryptSecret } from "@/lib/security/crypto";

const RECOVERY_FILE = "meshly-recovery-v2.json";

const accountSchema = z.object({ id: z.string().min(1), email: z.string().email(), googleSubject: z.string().min(1) });
const fileSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable(),
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  sha256: z.string().nullable(),
  status: z.string().min(1),
  starred: z.number().int(),
  description: z.string().nullable().optional(),
  version: z.number().int().positive().optional(),
  trashedAt: z.string().datetime().nullable(),
  trashedParentId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
const chunkSchema = z.object({
  id: z.string().min(1),
  fileId: z.string().min(1),
  accountId: z.string().min(1),
  part: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  physicalName: z.string().min(1),
  driveFileId: z.string().nullable(),
  sha256: z.string().nullable(),
  status: z.string().min(1),
});
const payloadSchema = z.object({
  version: z.literal(2),
  generatedAt: z.string().datetime(),
  sourceUserId: z.string().min(1),
  accounts: z.array(accountSchema),
  files: z.array(fileSchema).max(100000),
  chunks: z.array(chunkSchema).max(500000),
});
type RecoveryPayload = z.infer<typeof payloadSchema>;

function recoveryKey() {
  const key = process.env.RECOVERY_SECRET ?? process.env.SESSION_SECRET;
  if (!key) throw new Error("RECOVERY_SECRET or SESSION_SECRET is required");
  return key;
}
function signatureFor(payload: RecoveryPayload) {
  return createHmac("sha256", recoveryKey()).update(JSON.stringify(payload)).digest();
}
function parseRecoveryDocument(content: string) {
  const envelope = z.object({ payload: payloadSchema, signature: z.string().min(16) }).parse(JSON.parse(content));
  const expected = signatureFor(envelope.payload);
  const supplied = Buffer.from(envelope.signature, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error("Recovery manifest signature is invalid");
  return envelope.payload;
}

export async function buildRecoveryDocument(userId: string) {
  const db = getDb();
  const [accounts, managedFiles, parts] = await Promise.all([
    db.select({ id: linkedAccounts.id, email: linkedAccounts.email, googleSubject: linkedAccounts.googleSubject }).from(linkedAccounts).where(eq(linkedAccounts.userId, userId)),
    db.select().from(logicalFiles).where(and(eq(logicalFiles.userId, userId), eq(logicalFiles.sourceKind, "managed"))),
    db.select({ chunk: chunks }).from(chunks).innerJoin(logicalFiles, eq(chunks.fileId, logicalFiles.id)).where(and(eq(logicalFiles.userId, userId), eq(logicalFiles.sourceKind, "managed"))),
  ]);
  const managedIds = new Set(managedFiles.map((file) => file.id));
  const payload: RecoveryPayload = {
    version: 2,
    generatedAt: new Date().toISOString(),
    sourceUserId: userId,
    accounts,
    files: managedFiles.map((file) => ({
      id: file.id,
      parentId: file.parentId && managedIds.has(file.parentId) ? file.parentId : null,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      sha256: file.sha256,
      status: file.status,
      starred: file.starred,
      description: file.description,
      version: file.version,
      trashedAt: file.trashedAt?.toISOString() ?? null,
      trashedParentId: file.trashedParentId && managedIds.has(file.trashedParentId) ? file.trashedParentId : null,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
    })),
    chunks: parts.map(({ chunk }) => ({
      id: chunk.id,
      fileId: chunk.fileId,
      accountId: chunk.accountId,
      part: chunk.part,
      offset: chunk.offset,
      size: chunk.size,
      physicalName: chunk.physicalName,
      driveFileId: chunk.driveFileId,
      sha256: chunk.sha256,
      status: chunk.status,
    })),
  };
  return JSON.stringify({ payload, signature: signatureFor(payload).toString("base64url") });
}

export async function writeRecoverySnapshot(userId: string) {
  const db = getDb();
  const [document, accounts] = await Promise.all([
    buildRecoveryDocument(userId),
    db.select().from(linkedAccounts).where(eq(linkedAccounts.userId, userId)),
  ]);
  let written = 0;
  const failures: string[] = [];
  for (const account of accounts.filter((item) => item.status === "healthy")) {
    try {
      const access = await refreshGoogleAccessToken(decryptSecret(account.refreshTokenEncrypted));
      await upsertAppDataFile(access, RECOVERY_FILE, document);
      await db.insert(syncState).values({ accountId: account.id, lastRecoverySnapshot: new Date(), lastError: null }).onConflictDoUpdate({ target: syncState.accountId, set: { lastRecoverySnapshot: new Date(), lastError: null, updatedAt: new Date() } });
      written++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "snapshot failed";
      failures.push(`${account.email}: ${message}`);
      await db.insert(syncState).values({ accountId: account.id, lastError: message }).onConflictDoUpdate({ target: syncState.accountId, set: { lastError: message, updatedAt: new Date() } });
    }
  }
  await db.insert(activities).values({ id: nanoid(), userId, kind: "recovery_snapshot", metadata: { written, failures: failures.length } });
  return { written, failures };
}

export async function restoreRecoverySnapshot(userId: string) {
  const db = getDb();
  const currentAccounts = await db.select().from(linkedAccounts).where(eq(linkedAccounts.userId, userId));
  if (!currentAccounts.length) throw new Error("Connect at least one Google account before recovery");

  const candidates: { payload: RecoveryPayload; from: string }[] = [];
  const readFailures: string[] = [];
  for (const account of currentAccounts) {
    try {
      const access = await refreshGoogleAccessToken(decryptSecret(account.refreshTokenEncrypted));
      const remote = await readAppDataFile(access, RECOVERY_FILE);
      if (!remote) continue;
      candidates.push({ payload: parseRecoveryDocument(remote.content), from: account.email });
    } catch (error) {
      readFailures.push(`${account.email}: ${error instanceof Error ? error.message : "read failed"}`);
    }
  }
  if (!candidates.length) throw new Error(readFailures.length ? `No valid recovery manifest found. ${readFailures.join("; ")}` : "No recovery manifest found");
  candidates.sort((a, b) => Date.parse(b.payload.generatedAt) - Date.parse(a.payload.generatedAt));
  const selected = candidates[0]!;

  const currentBySubject = new Map(currentAccounts.map((account) => [account.googleSubject, account]));
  const currentByEmail = new Map(currentAccounts.map((account) => [account.email.toLowerCase(), account]));
  const accountMap = new Map<string, string>();
  for (const old of selected.payload.accounts) {
    const current = currentBySubject.get(old.googleSubject) ?? currentByEmail.get(old.email.toLowerCase());
    if (current) accountMap.set(old.id, current.id);
  }

  if (selected.payload.files.length) {
    const existing = await db.select({ id: logicalFiles.id, userId: logicalFiles.userId }).from(logicalFiles).where(inArray(logicalFiles.id, selected.payload.files.map((file) => file.id)));
    const foreign = existing.find((file) => file.userId !== userId);
    if (foreign) throw new Error("Recovery ID collision detected; restore aborted safely");
  }

  const unmappedFiles = new Set<string>();
  let restoredChunks = 0;
  await db.transaction(async (tx) => {
    for (const file of selected.payload.files) {
      const values = {
        id: file.id,
        userId,
        parentId: file.parentId,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        sha256: file.sha256,
        status: file.status,
        starred: file.starred,
        description: file.description ?? null,
        version: file.version ?? 1,
        trashedAt: file.trashedAt ? new Date(file.trashedAt) : null,
        trashedParentId: file.trashedParentId,
        sourceKind: "managed",
        createdAt: new Date(file.createdAt),
        updatedAt: new Date(file.updatedAt),
      };
      await tx.insert(logicalFiles).values(values).onConflictDoUpdate({
        target: logicalFiles.id,
        set: { userId, parentId: values.parentId, name: values.name, mimeType: values.mimeType, size: values.size, sha256: values.sha256, status: values.status, starred: values.starred, description: values.description, version: values.version, trashedAt: values.trashedAt, trashedParentId: values.trashedParentId, sourceKind: "managed", sourceAccountId: null, sourceDriveFileId: null, sourceMimeType: null, sourceWebViewLink: null, updatedAt: values.updatedAt },
      });
    }
    for (const chunk of selected.payload.chunks) {
      const mappedAccount = accountMap.get(chunk.accountId);
      if (!mappedAccount) {
        unmappedFiles.add(chunk.fileId);
        continue;
      }
      await tx.insert(chunks).values({ ...chunk, accountId: mappedAccount }).onConflictDoUpdate({
        target: chunks.id,
        set: { fileId: chunk.fileId, accountId: mappedAccount, part: chunk.part, offset: chunk.offset, size: chunk.size, physicalName: chunk.physicalName, driveFileId: chunk.driveFileId, sha256: chunk.sha256, status: chunk.status },
      });
      restoredChunks++;
    }
    for (const fileId of unmappedFiles) await tx.update(logicalFiles).set({ status: "degraded", updatedAt: new Date() }).where(eq(logicalFiles.id, fileId));
    await tx.insert(activities).values({ id: nanoid(), userId, kind: "recovery_restore", metadata: { source: selected.from, generatedAt: selected.payload.generatedAt, files: selected.payload.files.length, chunks: restoredChunks, unmappedFiles: unmappedFiles.size } });
  });

  return {
    source: selected.from,
    generatedAt: selected.payload.generatedAt,
    restoredFiles: selected.payload.files.length,
    restoredChunks,
    unmappedFiles: unmappedFiles.size,
    readFailures,
  };
}

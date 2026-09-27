import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import { providerAccounts, providerObjects } from "@/db/provider-schema";
import { activities, chunks, linkedAccounts, logicalFiles, syncState } from "@/db/schema";
import { readAppDataFile, upsertAppDataFile } from "@/lib/google/drive";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";
import { decryptSecret } from "@/lib/security/crypto";

const RECOVERY_FILE = "meshly-recovery-v2.json";

const accountSchema = z.object({ id: z.string().min(1), email: z.string().email(), googleSubject: z.string().min(1) });
const providerAccountSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  externalAccountId: z.string().min(1),
  email: z.string().nullable(),
});
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
  encryptionVersion: z.number().int().nonnegative().optional(),
  wrappedFileKey: z.string().nullable().optional(),
  encryptionNoncePrefix: z.string().nullable().optional(),
  encryptionFramePlainBytes: z.number().int().positive().nullable().optional(),
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
  physicalSize: z.number().int().positive().nullable().optional(),
  physicalName: z.string().min(1),
  driveFileId: z.string().nullable(),
  sha256: z.string().nullable(),
  ciphertextSha256: z.string().nullable().optional(),
  status: z.string().min(1),
});
const providerObjectSchema = z.object({
  id: z.string().min(1),
  fileId: z.string().min(1),
  providerAccountId: z.string().min(1),
  provider: z.string().min(1),
  physicalName: z.string().min(1),
  remoteId: z.string().nullable(),
  remotePath: z.string().nullable(),
  logicalSize: z.number().int().nonnegative(),
  physicalSize: z.number().int().positive(),
  ciphertextSha256: z.string().nullable(),
  status: z.string().min(1),
});
const commonPayload = {
  generatedAt: z.string().datetime(),
  sourceUserId: z.string().min(1),
  accounts: z.array(accountSchema),
  files: z.array(fileSchema).max(100000),
  chunks: z.array(chunkSchema).max(500000),
};
const payloadV2Schema = z.object({ version: z.literal(2), ...commonPayload });
const payloadV3Schema = z.object({
  version: z.literal(3),
  ...commonPayload,
  providerAccounts: z.array(providerAccountSchema).max(1000),
  providerObjects: z.array(providerObjectSchema).max(100000),
});
const payloadSchema = z.discriminatedUnion("version", [payloadV2Schema, payloadV3Schema]);
type RecoveryPayload = z.infer<typeof payloadSchema>;
type RecoveryPayloadV3 = z.infer<typeof payloadV3Schema>;

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
  const [accounts, cloudAccounts, managedFiles, parts, cloudObjects] = await Promise.all([
    db.select({ id: linkedAccounts.id, email: linkedAccounts.email, googleSubject: linkedAccounts.googleSubject }).from(linkedAccounts).where(eq(linkedAccounts.userId, userId)),
    db.select({ id: providerAccounts.id, provider: providerAccounts.provider, externalAccountId: providerAccounts.externalAccountId, email: providerAccounts.email }).from(providerAccounts).where(eq(providerAccounts.userId, userId)),
    db.select().from(logicalFiles).where(and(eq(logicalFiles.userId, userId), eq(logicalFiles.sourceKind, "managed"))),
    db.select({ chunk: chunks }).from(chunks).innerJoin(logicalFiles, eq(chunks.fileId, logicalFiles.id)).where(and(eq(logicalFiles.userId, userId), eq(logicalFiles.sourceKind, "managed"))),
    db.select({ object: providerObjects }).from(providerObjects).innerJoin(logicalFiles, eq(providerObjects.fileId, logicalFiles.id)).where(and(eq(logicalFiles.userId, userId), eq(logicalFiles.sourceKind, "managed"))),
  ]);
  const managedIds = new Set(managedFiles.map((file) => file.id));
  const payload: RecoveryPayloadV3 = {
    version: 3,
    generatedAt: new Date().toISOString(),
    sourceUserId: userId,
    accounts,
    providerAccounts: cloudAccounts,
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
      encryptionVersion: file.encryptionVersion,
      wrappedFileKey: file.wrappedFileKey,
      encryptionNoncePrefix: file.encryptionNoncePrefix,
      encryptionFramePlainBytes: file.encryptionFramePlainBytes,
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
      physicalSize: chunk.physicalSize,
      physicalName: chunk.physicalName,
      driveFileId: chunk.driveFileId,
      sha256: chunk.sha256,
      ciphertextSha256: chunk.ciphertextSha256,
      status: chunk.status,
    })),
    providerObjects: cloudObjects.map(({ object }) => ({
      id: object.id,
      fileId: object.fileId,
      providerAccountId: object.providerAccountId,
      provider: object.provider,
      physicalName: object.physicalName,
      remoteId: object.remoteId,
      remotePath: object.remotePath,
      logicalSize: object.logicalSize,
      physicalSize: object.physicalSize,
      ciphertextSha256: object.ciphertextSha256,
      status: object.status,
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
  await db.insert(activities).values({ id: nanoid(), userId, kind: "recovery_snapshot", metadata: { written, failures: failures.length, manifestVersion: 3 } });
  return { written, failures };
}

export async function restoreRecoverySnapshot(userId: string) {
  const db = getDb();
  const [currentAccounts, currentProviderAccounts] = await Promise.all([
    db.select().from(linkedAccounts).where(eq(linkedAccounts.userId, userId)),
    db.select().from(providerAccounts).where(eq(providerAccounts.userId, userId)),
  ]);
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

  const providerAccountMap = new Map<string, string>();
  if (selected.payload.version === 3) {
    const currentByIdentity = new Map(currentProviderAccounts.map((account) => [`${account.provider}:${account.externalAccountId}`, account]));
    const currentByProviderEmail = new Map(currentProviderAccounts.filter((account) => account.email).map((account) => [`${account.provider}:${account.email!.toLowerCase()}`, account]));
    for (const old of selected.payload.providerAccounts) {
      const current = currentByIdentity.get(`${old.provider}:${old.externalAccountId}`) ?? (old.email ? currentByProviderEmail.get(`${old.provider}:${old.email.toLowerCase()}`) : undefined);
      if (current) providerAccountMap.set(old.id, current.id);
    }
  }

  if (selected.payload.files.length) {
    const existing = await db.select({ id: logicalFiles.id, userId: logicalFiles.userId }).from(logicalFiles).where(inArray(logicalFiles.id, selected.payload.files.map((file) => file.id)));
    const foreign = existing.find((file) => file.userId !== userId);
    if (foreign) throw new Error("Recovery ID collision detected; restore aborted safely");
  }

  if (selected.payload.version === 3 && selected.payload.providerObjects.length) {
    const existingObjects = await db.select({ id: providerObjects.id, owner: providerAccounts.userId })
      .from(providerObjects)
      .innerJoin(providerAccounts, eq(providerObjects.providerAccountId, providerAccounts.id))
      .where(inArray(providerObjects.id, selected.payload.providerObjects.map((object) => object.id)));
    if (existingObjects.some((object) => object.owner !== userId)) throw new Error("Provider recovery ID collision detected; restore aborted safely");
  }

  const unmappedFiles = new Set<string>();
  let restoredChunks = 0;
  let restoredProviderObjects = 0;
  await db.transaction(async (tx) => {
    for (const file of selected.payload.files) {
      const encryptionVersion = file.encryptionVersion ?? 0;
      if (encryptionVersion === 1 && (!file.wrappedFileKey || !file.encryptionNoncePrefix || !file.encryptionFramePlainBytes)) {
        throw new Error(`Encrypted recovery metadata is incomplete for file ${file.id}`);
      }
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
        encryptionVersion,
        wrappedFileKey: file.wrappedFileKey ?? null,
        encryptionNoncePrefix: file.encryptionNoncePrefix ?? null,
        encryptionFramePlainBytes: file.encryptionFramePlainBytes ?? null,
        trashedAt: file.trashedAt ? new Date(file.trashedAt) : null,
        trashedParentId: file.trashedParentId,
        sourceKind: "managed",
        createdAt: new Date(file.createdAt),
        updatedAt: new Date(file.updatedAt),
      };
      await tx.insert(logicalFiles).values(values).onConflictDoUpdate({
        target: logicalFiles.id,
        set: {
          userId,
          parentId: values.parentId,
          name: values.name,
          mimeType: values.mimeType,
          size: values.size,
          sha256: values.sha256,
          status: values.status,
          starred: values.starred,
          description: values.description,
          version: values.version,
          encryptionVersion: values.encryptionVersion,
          wrappedFileKey: values.wrappedFileKey,
          encryptionNoncePrefix: values.encryptionNoncePrefix,
          encryptionFramePlainBytes: values.encryptionFramePlainBytes,
          trashedAt: values.trashedAt,
          trashedParentId: values.trashedParentId,
          sourceKind: "managed",
          sourceAccountId: null,
          sourceDriveFileId: null,
          sourceMimeType: null,
          sourceWebViewLink: null,
          updatedAt: values.updatedAt,
        },
      });
    }

    for (const chunk of selected.payload.chunks) {
      const mappedAccount = accountMap.get(chunk.accountId);
      if (!mappedAccount) {
        unmappedFiles.add(chunk.fileId);
        continue;
      }
      await tx.insert(chunks).values({
        id: chunk.id,
        fileId: chunk.fileId,
        accountId: mappedAccount,
        part: chunk.part,
        offset: chunk.offset,
        size: chunk.size,
        physicalSize: chunk.physicalSize ?? null,
        physicalName: chunk.physicalName,
        driveFileId: chunk.driveFileId,
        sha256: chunk.sha256,
        ciphertextSha256: chunk.ciphertextSha256 ?? null,
        status: chunk.status,
      }).onConflictDoUpdate({
        target: chunks.id,
        set: {
          fileId: chunk.fileId,
          accountId: mappedAccount,
          part: chunk.part,
          offset: chunk.offset,
          size: chunk.size,
          physicalSize: chunk.physicalSize ?? null,
          physicalName: chunk.physicalName,
          driveFileId: chunk.driveFileId,
          sha256: chunk.sha256,
          ciphertextSha256: chunk.ciphertextSha256 ?? null,
          status: chunk.status,
        },
      });
      restoredChunks++;
    }

    if (selected.payload.version === 3) {
      for (const object of selected.payload.providerObjects) {
        const mappedAccount = providerAccountMap.get(object.providerAccountId);
        if (!mappedAccount || object.status !== "ready" || !object.remotePath) {
          unmappedFiles.add(object.fileId);
          continue;
        }
        await tx.insert(providerObjects).values({
          id: object.id,
          fileId: object.fileId,
          providerAccountId: mappedAccount,
          provider: object.provider,
          physicalName: object.physicalName,
          remoteId: object.remoteId,
          remotePath: object.remotePath,
          logicalSize: object.logicalSize,
          physicalSize: object.physicalSize,
          ciphertextSha256: object.ciphertextSha256,
          uploadSessionEncrypted: null,
          uploadedBytes: object.physicalSize,
          status: "ready",
          metadata: { restoredFromRecovery: true },
        }).onConflictDoUpdate({
          target: providerObjects.fileId,
          set: {
            providerAccountId: mappedAccount,
            provider: object.provider,
            physicalName: object.physicalName,
            remoteId: object.remoteId,
            remotePath: object.remotePath,
            logicalSize: object.logicalSize,
            physicalSize: object.physicalSize,
            ciphertextSha256: object.ciphertextSha256,
            uploadSessionEncrypted: null,
            uploadedBytes: object.physicalSize,
            status: "ready",
            metadata: { restoredFromRecovery: true },
            updatedAt: new Date(),
          },
        });
        restoredProviderObjects++;
      }
    }

    for (const fileId of unmappedFiles) await tx.update(logicalFiles).set({ status: "degraded", updatedAt: new Date() }).where(eq(logicalFiles.id, fileId));
    await tx.insert(activities).values({
      id: nanoid(),
      userId,
      kind: "recovery_restore",
      metadata: {
        source: selected.from,
        generatedAt: selected.payload.generatedAt,
        manifestVersion: selected.payload.version,
        files: selected.payload.files.length,
        chunks: restoredChunks,
        providerObjects: restoredProviderObjects,
        unmappedFiles: unmappedFiles.size,
      },
    });
  });

  return {
    source: selected.from,
    generatedAt: selected.payload.generatedAt,
    manifestVersion: selected.payload.version,
    restoredFiles: selected.payload.files.length,
    restoredChunks,
    restoredProviderObjects,
    unmappedFiles: unmappedFiles.size,
    readFailures,
  };
}

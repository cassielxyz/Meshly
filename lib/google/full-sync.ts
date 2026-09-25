import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { activities, linkedAccounts, logicalFiles, syncState } from "@/db/schema";
import { getDriveRootId, getDriveStartPageToken, listAllDriveFiles, listDriveChanges, type DriveIndexedFile } from "@/lib/google/drive";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";
import { decryptSecret } from "@/lib/security/crypto";

const LOGICAL_FOLDER = "application/vnd.meshly.folder";
const DRIVE_FOLDER = "application/vnd.google-apps.folder";
type Account = typeof linkedAccounts.$inferSelect;

function logicalSourceId(accountId: string, driveFileId: string) {
  return `gd_${createHash("sha256").update(`${accountId}:${driveFileId}`).digest("base64url").slice(0, 28)}`;
}
function isMeshlyPhysical(file: DriveIndexedFile, storageFolderId: string | null) {
  return file.id === storageFolderId || Boolean(file.appProperties?.meshly || file.appProperties?.meshlyFileId || file.appProperties?.meshlyChunkId);
}
function safeSize(value?: string) {
  const parsed = Number(value ?? 0);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}
function safeDate(value?: string) {
  const parsed = value ? new Date(value) : new Date();
  return Number.isFinite(parsed.getTime()) ? parsed : new Date();
}
function valuesFor(account: Account, userId: string, file: DriveIndexedFile, parentId: string | null) {
  return {
    id: logicalSourceId(account.id, file.id),
    userId,
    parentId,
    name: file.name || "Untitled",
    mimeType: file.mimeType === DRIVE_FOLDER ? LOGICAL_FOLDER : file.mimeType,
    size: safeSize(file.size),
    sha256: file.sha256Checksum ?? null,
    status: "ready",
    sourceKind: "external",
    sourceAccountId: account.id,
    sourceDriveFileId: file.id,
    sourceMimeType: file.mimeType,
    sourceWebViewLink: file.webViewLink ?? null,
    createdAt: safeDate(file.createdTime),
    updatedAt: safeDate(file.modifiedTime),
  };
}
async function upsertExternal(account: Account, userId: string, file: DriveIndexedFile, parentId: string | null) {
  const db = getDb();
  const values = valuesFor(account, userId, file, parentId);
  await db.insert(logicalFiles).values(values).onConflictDoUpdate({
    target: logicalFiles.id,
    set: {
      userId,
      parentId,
      name: values.name,
      mimeType: values.mimeType,
      size: values.size,
      sha256: values.sha256,
      status: "ready",
      sourceKind: "external",
      sourceAccountId: account.id,
      sourceDriveFileId: file.id,
      sourceMimeType: file.mimeType,
      sourceWebViewLink: values.sourceWebViewLink,
      updatedAt: values.updatedAt,
    },
  });
}

export async function fullIndexDriveAccount(userId: string, accountId: string) {
  const db = getDb();
  const account = (await db.select().from(linkedAccounts).where(and(eq(linkedAccounts.id, accountId), eq(linkedAccounts.userId, userId))).limit(1))[0];
  if (!account) throw new Error("Storage account not found");
  if (account.mode !== "full") throw new Error("Reconnect this account in Full Drive mode before indexing existing files");

  const access = await refreshGoogleAccessToken(decryptSecret(account.refreshTokenEncrypted));
  const [rootId, remoteFiles] = await Promise.all([getDriveRootId(access), listAllDriveFiles(access)]);
  const visible = remoteFiles.filter((file) => !file.trashed && !isMeshlyPhysical(file, account.storageFolderId));
  const visibleIds = new Set(visible.map((file) => file.id));
  const existing = await db.select({ id: logicalFiles.id, sourceDriveFileId: logicalFiles.sourceDriveFileId }).from(logicalFiles).where(and(eq(logicalFiles.userId, userId), eq(logicalFiles.sourceKind, "external"), eq(logicalFiles.sourceAccountId, account.id)));

  for (const file of visible) {
    const driveParent = file.parents?.[0];
    const parentId = driveParent && driveParent !== rootId && visibleIds.has(driveParent) ? logicalSourceId(account.id, driveParent) : null;
    await upsertExternal(account, userId, file, parentId);
  }

  const stale = existing.filter((item) => item.sourceDriveFileId && !visibleIds.has(item.sourceDriveFileId)).map((item) => item.id);
  if (stale.length) await db.delete(logicalFiles).where(and(eq(logicalFiles.userId, userId), inArray(logicalFiles.id, stale)));
  const changePageToken = await getDriveStartPageToken(access);
  await db.insert(syncState).values({ accountId: account.id, changePageToken, lastError: null }).onConflictDoUpdate({ target: syncState.accountId, set: { changePageToken, lastError: null, updatedAt: new Date() } });
  await db.insert(activities).values({ id: nanoid(), userId, kind: "full_drive_index", subjectId: account.id, metadata: { account: account.email, indexed: visible.length, removed: stale.length } });
  return { indexed: visible.length, removed: stale.length, mode: "full" as const };
}

export async function syncDriveAccountChanges(userId: string, accountId: string) {
  const db = getDb();
  const account = (await db.select().from(linkedAccounts).where(and(eq(linkedAccounts.id, accountId), eq(linkedAccounts.userId, userId))).limit(1))[0];
  if (!account || account.mode !== "full") return { skipped: true as const, changed: 0 };
  const state = (await db.select().from(syncState).where(eq(syncState.accountId, account.id)).limit(1))[0];
  if (!state?.changePageToken) return fullIndexDriveAccount(userId, account.id);

  const access = await refreshGoogleAccessToken(decryptSecret(account.refreshTokenEncrypted));
  const changes = await listDriveChanges(access, state.changePageToken);
  if (changes.expired) return fullIndexDriveAccount(userId, account.id);
  const rootId = await getDriveRootId(access);
  let changed = 0;

  for (const change of changes.changes) {
    const existing = (await db.select().from(logicalFiles).where(and(eq(logicalFiles.userId, userId), eq(logicalFiles.sourceAccountId, account.id), eq(logicalFiles.sourceDriveFileId, change.fileId))).limit(1))[0];
    const file = change.file;
    if (change.removed || !file || file.trashed || isMeshlyPhysical(file, account.storageFolderId)) {
      if (existing) await db.delete(logicalFiles).where(eq(logicalFiles.id, existing.id));
      changed++;
      continue;
    }
    const driveParent = file.parents?.[0];
    let parentId: string | null = null;
    if (driveParent && driveParent !== rootId) {
      const parent = (await db.select({ id: logicalFiles.id }).from(logicalFiles).where(and(eq(logicalFiles.userId, userId), eq(logicalFiles.sourceAccountId, account.id), eq(logicalFiles.sourceDriveFileId, driveParent))).limit(1))[0];
      parentId = parent?.id ?? null;
    }
    await upsertExternal(account, userId, file, parentId);
    changed++;
  }

  await db.insert(syncState).values({ accountId: account.id, changePageToken: changes.newStartPageToken, lastError: null }).onConflictDoUpdate({ target: syncState.accountId, set: { changePageToken: changes.newStartPageToken, lastError: null, updatedAt: new Date() } });
  if (changed) await db.insert(activities).values({ id: nanoid(), userId, kind: "full_drive_sync", subjectId: account.id, metadata: { account: account.email, changed } });
  return { skipped: false as const, changed };
}

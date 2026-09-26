import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import { chunks, defaultPreferences, linkedAccounts, logicalFiles, userSettings } from "@/db/schema";
import { createResumableSession, ensureMeshlyFolder } from "@/lib/google/drive";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";
import { createManagedFileEncryption } from "@/lib/security/file-encryption";
import { decryptSecret } from "@/lib/security/crypto";
import { AuthError, requireRequestUser } from "@/lib/server/auth";
import { AES_GCM_TAG_BYTES } from "@/lib/storage/encryption-format";
import { planPlacement } from "@/lib/storage/planner";

const inputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  size: z.number().int().positive().max(5 * 1024 * 1024 * 1024 * 1024),
  mimeType: z.string().min(1).max(200).default("application/octet-stream"),
  parentId: z.string().nullable().optional(),
  accountId: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireRequestUser(request);
    const input = inputSchema.parse(await request.json());
    const db = getDb();

    if (input.parentId) {
      const parent = (await db.select().from(logicalFiles).where(and(
        eq(logicalFiles.id, input.parentId),
        eq(logicalFiles.userId, userId),
        eq(logicalFiles.mimeType, "application/vnd.meshly.folder"),
        isNull(logicalFiles.trashedAt),
      )).limit(1))[0];
      if (!parent) return NextResponse.json({ error: "invalid_parent" }, { status: 400 });
    }

    const prefs = (await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1))[0]?.preferences ?? defaultPreferences;
    const accounts = await db.select().from(linkedAccounts).where(and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.status, "healthy")));
    const fileId = nanoid();
    const encryption = createManagedFileEncryption(fileId, input.size);

    const placements = planPlacement(encryption.physicalSize, accounts.map((account) => ({
      id: account.id,
      freeBytes: Math.max(0, account.quotaLimit - account.quotaUsage),
      priority: account.priority,
      healthy: true,
    })), {
      reserveBytes: prefs.reserveBytes,
      wholeFileFirst: true,
      allowCrossAccountSplit: false,
      preferredAccountId: input.accountId,
    });
    const placement = placements[0];
    if (!placement || placements.length !== 1) throw new Error("Google managed upload must resolve to exactly one account");
    const account = accounts.find((item) => item.id === placement.accountId);
    if (!account) throw new Error("Storage account disappeared during planning");

    await db.insert(logicalFiles).values({
      id: fileId,
      userId,
      parentId: input.parentId ?? null,
      name: input.name,
      mimeType: input.mimeType,
      size: input.size,
      status: "uploading",
      encryptionVersion: encryption.version,
      wrappedFileKey: encryption.wrappedFileKey,
      encryptionNoncePrefix: encryption.noncePrefixBase64Url,
      encryptionFramePlainBytes: encryption.framePlainBytes,
    });

    const accessToken = await refreshGoogleAccessToken(decryptSecret(account.refreshTokenEncrypted));
    const parentId = account.storageFolderId ?? await ensureMeshlyFolder(accessToken);
    if (!account.storageFolderId) await db.update(linkedAccounts).set({ storageFolderId: parentId }).where(eq(linkedAccounts.id, account.id));

    const chunkId = nanoid();
    const physicalName = `msh_${nanoid(24)}.bin`;
    await db.insert(chunks).values({
      id: chunkId,
      fileId,
      accountId: account.id,
      part: 0,
      offset: 0,
      size: input.size,
      physicalSize: encryption.physicalSize,
      physicalName,
    });

    const uploadUrl = await createResumableSession(accessToken, {
      name: physicalName,
      size: encryption.physicalSize,
      mimeType: "application/octet-stream",
      parentId,
      appProperties: {
        meshlyFileId: fileId,
        meshlyChunkId: chunkId,
        meshlyPart: "0",
        meshlyEncryption: "v1",
      },
    });

    return NextResponse.json({
      fileId,
      provider: "google-drive",
      placementMode: "whole-file",
      sessions: [{ chunkId, accountId: account.id, part: 0, offset: 0, size: input.size, physicalSize: encryption.physicalSize, uploadUrl }],
      encryption: {
        version: encryption.version,
        key: encryption.rawKeyBase64Url,
        noncePrefix: encryption.noncePrefixBase64Url,
        framePlainBytes: encryption.framePlainBytes,
        tagBytes: AES_GCM_TAG_BYTES,
        physicalSize: encryption.physicalSize,
      },
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Upload planning failed", error);
    const message = error instanceof Error ? error.message : "Unable to plan upload";
    const insufficient = /enough available storage|single storage account|Not enough pooled storage/.test(message);
    return NextResponse.json({ error: message }, { status: insufficient ? 507 : 400 });
  }
}

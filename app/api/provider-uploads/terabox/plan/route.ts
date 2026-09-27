import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import { providerAccounts, providerObjects } from "@/db/provider-schema";
import { defaultPreferences, logicalFiles, userSettings } from "@/db/schema";
import {
  getTeraBoxManagedPath,
  isTeraBoxManagedUploadsEnabled,
  refreshTeraBoxAccount,
  TERABOX_SERVERLESS_MAX_CIPHERTEXT_BYTES,
} from "@/lib/providers/terabox";
import { createTeraBoxWorkerToken, getTeraBoxWorkerUrl, isTeraBoxLargeWorkerEnabled } from "@/lib/providers/terabox-worker";
import { createManagedFileEncryption } from "@/lib/security/file-encryption";
import { AuthError, requireRequestUser } from "@/lib/server/auth";
import { AES_GCM_TAG_BYTES, frameCount } from "@/lib/storage/encryption-format";

const inputSchema = z.object({
  providerAccountId: z.string().min(1),
  name: z.string().trim().min(1).max(255),
  size: z.number().int().positive(),
  mimeType: z.string().min(1).max(200).default("application/octet-stream"),
  parentId: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!isTeraBoxManagedUploadsEnabled()) {
      return NextResponse.json({ error: "terabox_managed_uploads_not_enabled" }, { status: 503 });
    }

    const { userId } = await requireRequestUser(request);
    const input = inputSchema.parse(await request.json());
    const db = getDb();

    if (input.parentId) {
      const parent = (await db.select({ id: logicalFiles.id }).from(logicalFiles).where(and(
        eq(logicalFiles.id, input.parentId),
        eq(logicalFiles.userId, userId),
        eq(logicalFiles.mimeType, "application/vnd.meshly.folder"),
        isNull(logicalFiles.trashedAt),
      )).limit(1))[0];
      if (!parent) return NextResponse.json({ error: "invalid_parent" }, { status: 400 });
    }

    let account = (await db.select().from(providerAccounts).where(and(
      eq(providerAccounts.id, input.providerAccountId),
      eq(providerAccounts.userId, userId),
      eq(providerAccounts.provider, "terabox"),
    )).limit(1))[0];
    if (!account) return NextResponse.json({ error: "provider_account_not_found" }, { status: 404 });

    const refreshed = await refreshTeraBoxAccount(account);
    if (!refreshed.ok) return NextResponse.json({ error: "terabox_account_needs_reauthorization" }, { status: 409 });
    account = (await db.select().from(providerAccounts).where(eq(providerAccounts.id, account.id)).limit(1))[0]!;
    if (account.status !== "healthy") return NextResponse.json({ error: "terabox_account_not_healthy" }, { status: 409 });

    const fileId = nanoid();
    const objectId = nanoid();
    const encryption = createManagedFileEncryption(fileId, input.size);
    const frames = frameCount(input.size, encryption.framePlainBytes);
    const maxPartBytes = encryption.framePlainBytes + AES_GCM_TAG_BYTES;
    const useWorker = encryption.physicalSize > TERABOX_SERVERLESS_MAX_CIPHERTEXT_BYTES;
    if (useWorker && !isTeraBoxLargeWorkerEnabled()) {
      return NextResponse.json({
        error: "terabox_large_worker_not_enabled",
        maxCiphertextBytes: TERABOX_SERVERLESS_MAX_CIPHERTEXT_BYTES,
        message: "This TeraBox upload needs the dedicated large-file transfer worker, which is not enabled on this deployment.",
      }, { status: 413 });
    }

    const preferences = (await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1))[0]?.preferences ?? defaultPreferences;
    const free = Math.max(0, account.quotaLimit - account.quotaUsage);
    const required = encryption.physicalSize + Math.max(0, preferences.reserveBytes);
    if (account.quotaLimit > 0 && free < required) {
      return NextResponse.json({ error: "not_enough_terabox_storage" }, { status: 507 });
    }

    const physicalName = `msh_${nanoid(24)}.bin`;
    const remotePath = getTeraBoxManagedPath(physicalName);
    const transport = useWorker ? "terabox-worker-v1" : "terabox-single-shard-v1";
    await db.transaction(async (tx) => {
      await tx.insert(logicalFiles).values({
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
      await tx.insert(providerObjects).values({
        id: objectId,
        fileId,
        providerAccountId: account.id,
        provider: "terabox",
        physicalName,
        remotePath,
        logicalSize: input.size,
        physicalSize: encryption.physicalSize,
        uploadedBytes: 0,
        status: "uploading",
        metadata: {
          encryptionVersion: 1,
          transport,
          serverlessSmallFile: !useWorker,
          ...(useWorker ? { workerFrames: frames, workerMaxPartBytes: maxPartBytes } : {}),
        },
      });
    });

    const worker = useWorker ? {
      url: getTeraBoxWorkerUrl(),
      token: createTeraBoxWorkerToken({
        objectId,
        fileId,
        userId,
        physicalSize: encryption.physicalSize,
        frames,
        maxPartBytes,
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      }),
      frames,
      maxPartBytes,
    } : null;

    return NextResponse.json({
      fileId,
      objectId,
      provider: "terabox",
      providerAccountId: account.id,
      transport: useWorker ? "worker" : "serverless",
      maxCiphertextBytes: TERABOX_SERVERLESS_MAX_CIPHERTEXT_BYTES,
      worker,
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
    console.error("TeraBox upload planning failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "terabox_upload_plan_failed" }, { status: 400 });
  }
}

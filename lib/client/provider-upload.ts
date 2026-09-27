"use client";

import { createSHA256 } from "hash-wasm";
import { decodeBase64Url, encryptManagedFrame, importManagedFileKey } from "@/lib/client/file-encryption";
import { frameCount, frameLayout } from "@/lib/storage/encryption-format";

type EncryptionPlan = {
  version: 1;
  key: string;
  noncePrefix: string;
  framePlainBytes: number;
  tagBytes: number;
  physicalSize: number;
};

type ProviderPlan = {
  fileId: string;
  objectId: string;
  provider: "dropbox";
  providerAccountId: string;
  maxProxyChunkBytes: number;
  encryption: EncryptionPlan;
};

export type ProviderUploadProgress = {
  phase: "planning" | "encrypting" | "uploading" | "verifying" | "done";
  percent: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendEncryptedSlice(objectId: string, body: Uint8Array, offset: number, maxBytes: number) {
  if (!body.byteLength || body.byteLength > maxBytes) throw new Error("Invalid provider proxy slice size");
  let attempt = 0;
  for (;;) {
    try {
      const response = await fetch(`/api/provider-uploads/${encodeURIComponent(objectId)}/part?offset=${offset}`, {
        method: "PUT",
        headers: { "content-type": "application/octet-stream" },
        body,
      });
      const result = await response.json().catch(() => ({})) as { acceptedOffset?: number; expectedOffset?: number; error?: string };
      if (response.ok && Number.isSafeInteger(result.acceptedOffset)) return result.acceptedOffset!;
      if (response.status === 409 && Number.isSafeInteger(result.expectedOffset)) return result.expectedOffset!;
      if (response.status < 500 && response.status !== 408 && response.status !== 425 && response.status !== 429) {
        throw new Error(result.error ?? `Provider upload failed (${response.status})`);
      }
    } catch (error) {
      if (attempt >= 5) throw error;
    }
    attempt++;
    if (attempt > 5) throw new Error("Provider upload could not be resumed");
    await sleep(Math.min(8000, 400 * 2 ** attempt));
  }
}

async function abortProviderUpload(objectId: string) {
  await fetch(`/api/provider-uploads/${encodeURIComponent(objectId)}/abort`, { method: "POST" }).catch(() => undefined);
}

export async function uploadMeshlyDropboxFile(
  file: File,
  providerAccountId: string,
  onProgress?: (value: ProviderUploadProgress) => void,
  parentId?: string | null,
) {
  onProgress?.({ phase: "planning", percent: 0 });
  const planResponse = await fetch("/api/provider-uploads/plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      providerAccountId,
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      parentId: parentId ?? null,
    }),
  });
  const planError = await planResponse.clone().json().catch(() => ({})) as { error?: string };
  if (!planResponse.ok) throw new Error(planError.error ?? "Unable to plan Dropbox upload");
  const plan = await planResponse.json() as ProviderPlan;
  if (plan.provider !== "dropbox" || plan.encryption?.version !== 1 || !Number.isSafeInteger(plan.maxProxyChunkBytes) || plan.maxProxyChunkBytes <= 0) {
    throw new Error("Meshly returned an invalid Dropbox encryption plan");
  }

  const key = await importManagedFileKey(plan.encryption.key);
  const noncePrefix = decodeBase64Url(plan.encryption.noncePrefix);
  const plaintextHash = await createSHA256();
  const ciphertextHash = await createSHA256();
  plaintextHash.init();
  ciphertextHash.init();
  const frames = frameCount(file.size, plan.encryption.framePlainBytes);
  let acceptedPhysical = 0;

  try {
    for (let frameIndex = 0; frameIndex < frames; frameIndex++) {
      const layout = frameLayout(file.size, frameIndex, plan.encryption.framePlainBytes, plan.encryption.tagBytes);
      const plainBuffer = await file.slice(layout.plainOffset, layout.plainOffset + layout.plainSize).arrayBuffer();
      plaintextHash.update(new Uint8Array(plainBuffer));
      onProgress?.({ phase: "encrypting", percent: Math.round((layout.plainOffset / Math.max(1, file.size)) * 100) });
      const encrypted = await encryptManagedFrame({
        key,
        noncePrefix,
        fileId: plan.fileId,
        fileSize: file.size,
        frameIndex,
        plaintext: plainBuffer,
      });
      if (encrypted.byteLength !== layout.cipherSize) throw new Error("Encrypted provider frame size mismatch");
      ciphertextHash.update(encrypted);

      let localOffset = 0;
      while (localOffset < encrypted.byteLength) {
        const physicalOffset = layout.cipherOffset + localOffset;
        if (physicalOffset < acceptedPhysical) {
          const skip = Math.min(encrypted.byteLength - localOffset, acceptedPhysical - physicalOffset);
          localOffset += skip;
          continue;
        }
        if (physicalOffset !== acceptedPhysical) throw new Error("Provider upload resume offset diverged from encrypted stream");
        const length = Math.min(plan.maxProxyChunkBytes, encrypted.byteLength - localOffset);
        const slice = encrypted.subarray(localOffset, localOffset + length);
        const next = await sendEncryptedSlice(plan.objectId, slice, physicalOffset, plan.maxProxyChunkBytes);
        if (next < physicalOffset || next > plan.encryption.physicalSize) throw new Error("Provider returned an invalid resume offset");
        if (next > physicalOffset + length) throw new Error("Provider resume offset advanced beyond the submitted encrypted slice");
        if (next === physicalOffset) throw new Error("Provider did not accept encrypted bytes");
        acceptedPhysical = next;
        localOffset = Math.max(localOffset, acceptedPhysical - layout.cipherOffset);
        onProgress?.({ phase: "uploading", percent: Math.min(100, Math.round((acceptedPhysical / plan.encryption.physicalSize) * 100)) });
      }
    }

    if (acceptedPhysical !== plan.encryption.physicalSize) throw new Error("Encrypted Dropbox upload ended at an unexpected offset");
    onProgress?.({ phase: "verifying", percent: 100 });
    const commit = await fetch(`/api/provider-uploads/${encodeURIComponent(plan.objectId)}/commit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sha256: plaintextHash.digest("hex"), ciphertextSha256: ciphertextHash.digest("hex") }),
    });
    const result = await commit.json().catch(() => ({})) as { ok?: boolean; fileId?: string; downloadUrl?: string; error?: string };
    if (!commit.ok || !result.ok || !result.fileId || !result.downloadUrl) throw new Error(result.error ?? "Dropbox encrypted-object verification failed");
    onProgress?.({ phase: "done", percent: 100 });
    return { ok: true as const, fileId: result.fileId, downloadUrl: result.downloadUrl };
  } catch (error) {
    await abortProviderUpload(plan.objectId);
    throw error;
  }
}

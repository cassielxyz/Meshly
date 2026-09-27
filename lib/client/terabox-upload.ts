"use client";

import { createSHA256 } from "hash-wasm";
import { decodeBase64Url, encryptManagedFrame, importManagedFileKey } from "@/lib/client/file-encryption";
import { frameCount, frameLayout } from "@/lib/storage/encryption-format";
import type { ProviderUploadProgress } from "@/lib/client/provider-upload";

type Plan = {
  fileId: string;
  objectId: string;
  provider: "terabox";
  providerAccountId: string;
  maxCiphertextBytes: number;
  encryption: {
    version: 1;
    key: string;
    noncePrefix: string;
    framePlainBytes: number;
    tagBytes: number;
    physicalSize: number;
  };
};

function body(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function abort(objectId: string) {
  await fetch(`/api/provider-uploads/${encodeURIComponent(objectId)}/abort`, { method: "POST" }).catch(() => undefined);
}

export async function uploadMeshlyTeraBoxFile(
  file: File,
  providerAccountId: string,
  onProgress?: (value: ProviderUploadProgress) => void,
  parentId?: string | null,
) {
  onProgress?.({ phase: "planning", percent: 0 });
  const planResponse = await fetch("/api/provider-uploads/terabox/plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ providerAccountId, name: file.name, size: file.size, mimeType: file.type || "application/octet-stream", parentId: parentId ?? null }),
  });
  const planError = await planResponse.clone().json().catch(() => ({})) as { error?: string; message?: string };
  if (!planResponse.ok) throw new Error(planError.message ?? planError.error ?? "Unable to plan TeraBox upload");
  const plan = await planResponse.json() as Plan;
  if (plan.provider !== "terabox" || plan.encryption?.version !== 1 || plan.encryption.physicalSize > plan.maxCiphertextBytes) {
    throw new Error("Meshly returned an invalid TeraBox encryption plan");
  }

  const frames = frameCount(file.size, plan.encryption.framePlainBytes);
  if (frames !== 1) throw new Error("TeraBox serverless beta currently accepts one encrypted frame per managed file");
  const layout = frameLayout(file.size, 0, plan.encryption.framePlainBytes, plan.encryption.tagBytes);
  const plainBuffer = await file.arrayBuffer();
  const plaintextHash = await createSHA256();
  const ciphertextHash = await createSHA256();
  plaintextHash.init();
  ciphertextHash.init();
  plaintextHash.update(new Uint8Array(plainBuffer));

  try {
    onProgress?.({ phase: "encrypting", percent: 30 });
    const key = await importManagedFileKey(plan.encryption.key);
    const noncePrefix = decodeBase64Url(plan.encryption.noncePrefix);
    const encrypted = await encryptManagedFrame({ key, noncePrefix, fileId: plan.fileId, fileSize: file.size, frameIndex: 0, plaintext: plainBuffer });
    if (encrypted.byteLength !== layout.cipherSize || encrypted.byteLength !== plan.encryption.physicalSize) throw new Error("Encrypted TeraBox object size mismatch");
    ciphertextHash.update(encrypted);

    onProgress?.({ phase: "uploading", percent: 60 });
    const upload = await fetch(`/api/provider-uploads/terabox/${encodeURIComponent(plan.objectId)}/part`, {
      method: "PUT",
      headers: { "content-type": "application/octet-stream" },
      body: body(encrypted),
    });
    const uploadResult = await upload.json().catch(() => ({})) as { error?: string };
    if (!upload.ok) throw new Error(uploadResult.error ?? "TeraBox encrypted-object upload failed");

    onProgress?.({ phase: "verifying", percent: 90 });
    const commit = await fetch(`/api/provider-uploads/terabox/${encodeURIComponent(plan.objectId)}/commit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sha256: plaintextHash.digest("hex"), ciphertextSha256: ciphertextHash.digest("hex") }),
    });
    const result = await commit.json().catch(() => ({})) as { ok?: boolean; fileId?: string; downloadUrl?: string; error?: string };
    if (!commit.ok || !result.ok || !result.fileId || !result.downloadUrl) throw new Error(result.error ?? "TeraBox encrypted-object verification failed");
    onProgress?.({ phase: "done", percent: 100 });
    return { ok: true as const, fileId: result.fileId, downloadUrl: result.downloadUrl };
  } catch (error) {
    await abort(plan.objectId);
    throw error;
  }
}

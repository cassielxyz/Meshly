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
  transport: "serverless" | "worker";
  maxCiphertextBytes: number;
  worker: null | {
    url: string;
    token: string;
    frames: number;
    maxPartBytes: number;
  };
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

async function abortWorker(plan: Plan) {
  if (plan.transport !== "worker" || !plan.worker) return;
  await fetch(`${plan.worker.url.replace(/\/$/, "")}/v1/terabox/${encodeURIComponent(plan.objectId)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${plan.worker.token}` },
  }).catch(() => undefined);
}

async function uploadWorkerPart(plan: Plan, frameIndex: number, encrypted: Uint8Array) {
  if (!plan.worker) throw new Error("TeraBox worker plan is missing");
  const response = await fetch(`${plan.worker.url.replace(/\/$/, "")}/v1/terabox/${encodeURIComponent(plan.objectId)}/parts/${frameIndex}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${plan.worker.token}`,
      "content-type": "application/octet-stream",
    },
    body: body(encrypted),
  });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error ?? `TeraBox worker rejected encrypted frame ${frameIndex}`);
}

async function commitWorker(plan: Plan, ciphertextSha256: string) {
  if (!plan.worker) throw new Error("TeraBox worker plan is missing");
  const response = await fetch(`${plan.worker.url.replace(/\/$/, "")}/v1/terabox/${encodeURIComponent(plan.objectId)}/commit`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${plan.worker.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ ciphertextSha256 }),
  });
  const result = await response.json().catch(() => ({})) as { ok?: boolean; uploadedBytes?: number; error?: string };
  if (!response.ok || !result.ok || result.uploadedBytes !== plan.encryption.physicalSize) {
    throw new Error(result.error ?? "TeraBox worker failed to finalize the encrypted object");
  }
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
  if (plan.provider !== "terabox" || plan.encryption?.version !== 1 || !["serverless", "worker"].includes(plan.transport)) {
    throw new Error("Meshly returned an invalid TeraBox encryption plan");
  }

  const frames = frameCount(file.size, plan.encryption.framePlainBytes);
  if (plan.transport === "serverless") {
    if (frames !== 1 || plan.encryption.physicalSize > plan.maxCiphertextBytes || plan.worker) {
      throw new Error("Meshly returned an invalid TeraBox serverless plan");
    }
  } else {
    if (!plan.worker || plan.worker.frames !== frames || plan.worker.maxPartBytes !== plan.encryption.framePlainBytes + plan.encryption.tagBytes) {
      throw new Error("Meshly returned an invalid TeraBox worker plan");
    }
    const workerUrl = new URL(plan.worker.url);
    if (workerUrl.protocol !== "https:" && !["localhost", "127.0.0.1", "::1"].includes(workerUrl.hostname)) {
      throw new Error("Meshly returned an insecure TeraBox worker URL");
    }
  }

  const plaintextHash = await createSHA256();
  const ciphertextHash = await createSHA256();
  plaintextHash.init();
  ciphertextHash.init();

  try {
    const key = await importManagedFileKey(plan.encryption.key);
    const noncePrefix = decodeBase64Url(plan.encryption.noncePrefix);

    for (let frameIndex = 0; frameIndex < frames; frameIndex += 1) {
      const layout = frameLayout(file.size, frameIndex, plan.encryption.framePlainBytes, plan.encryption.tagBytes);
      const plainBuffer = await file.slice(layout.plainStart, layout.plainStart + layout.plainSize).arrayBuffer();
      plaintextHash.update(new Uint8Array(plainBuffer));
      onProgress?.({ phase: "encrypting", percent: Math.round(10 + (frameIndex / Math.max(1, frames)) * 20) });
      const encrypted = await encryptManagedFrame({ key, noncePrefix, fileId: plan.fileId, fileSize: file.size, frameIndex, plaintext: plainBuffer });
      if (encrypted.byteLength !== layout.cipherSize) throw new Error(`Encrypted TeraBox frame ${frameIndex} size mismatch`);
      ciphertextHash.update(encrypted);

      if (plan.transport === "worker") {
        await uploadWorkerPart(plan, frameIndex, encrypted);
        onProgress?.({ phase: "uploading", percent: Math.round(30 + ((frameIndex + 1) / frames) * 55) });
      } else {
        const upload = await fetch(`/api/provider-uploads/terabox/${encodeURIComponent(plan.objectId)}/part`, {
          method: "PUT",
          headers: { "content-type": "application/octet-stream" },
          body: body(encrypted),
        });
        const uploadResult = await upload.json().catch(() => ({})) as { error?: string };
        if (!upload.ok) throw new Error(uploadResult.error ?? "TeraBox encrypted-object upload failed");
        onProgress?.({ phase: "uploading", percent: 85 });
      }
    }

    const plaintextSha256 = plaintextHash.digest("hex");
    const ciphertextSha256 = ciphertextHash.digest("hex");
    if (plan.transport === "worker") {
      onProgress?.({ phase: "verifying", percent: 90 });
      await commitWorker(plan, ciphertextSha256);
    }

    onProgress?.({ phase: "verifying", percent: 94 });
    const commit = await fetch(`/api/provider-uploads/terabox/${encodeURIComponent(plan.objectId)}/commit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sha256: plaintextSha256, ciphertextSha256 }),
    });
    const result = await commit.json().catch(() => ({})) as { ok?: boolean; fileId?: string; downloadUrl?: string; error?: string };
    if (!commit.ok || !result.ok || !result.fileId || !result.downloadUrl) throw new Error(result.error ?? "TeraBox encrypted-object verification failed");
    onProgress?.({ phase: "done", percent: 100 });
    return { ok: true as const, fileId: result.fileId, downloadUrl: result.downloadUrl };
  } catch (error) {
    await abortWorker(plan);
    await abort(plan.objectId);
    throw error;
  }
}

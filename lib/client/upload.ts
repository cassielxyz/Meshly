"use client";

import { createSHA256 } from "hash-wasm";
import { decodeBase64Url, encryptManagedFrame, importManagedFileKey } from "@/lib/client/file-encryption";
import { CIPHER_FRAME_BYTES, frameCount, frameLayout } from "@/lib/storage/encryption-format";

type PlannedSession = {
  chunkId: string;
  accountId: string;
  part: number;
  offset: number;
  size: number;
  physicalSize: number;
  uploadUrl: string;
};
type EncryptionPlan = {
  version: 1;
  key: string;
  noncePrefix: string;
  framePlainBytes: number;
  tagBytes: number;
  physicalSize: number;
};
type PlanResponse = { fileId: string; sessions: PlannedSession[]; encryption: EncryptionPlan };
type Progress = { phase: "planning" | "hashing" | "encrypting" | "uploading" | "verifying" | "done"; percent: number; part?: number; parts?: number };
type CompletedChunk = { chunkId: string; driveFileId: string; sha256: string; ciphertextSha256: string };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function receivedOffset(response: Response) {
  const range = response.headers.get("range");
  const match = range ? /^bytes=0-(\d+)$/.exec(range) : null;
  return match ? Number(match[1]) + 1 : null;
}
async function queryUploadState(session: PlannedSession) {
  const response = await fetch(session.uploadUrl, {
    method: "PUT",
    headers: { "Content-Range": `bytes */${session.physicalSize}` },
  });
  if (response.ok) {
    const data = (await response.json()) as { id?: string };
    if (!data.id) throw new Error("Drive finalized encrypted upload without an id");
    return { done: true as const, driveFileId: data.id, offset: session.physicalSize };
  }
  if (response.status === 308) return { done: false as const, driveFileId: null, offset: receivedOffset(response) ?? 0 };
  if (response.status === 404) throw new Error("Encrypted upload session expired");
  throw new Error(`Unable to query encrypted upload state (${response.status})`);
}

async function prehashEncrypted(file: File, fileId: string, encryption: EncryptionPlan, onProgress?: (percent: number) => void) {
  const key = await importManagedFileKey(encryption.key);
  const noncePrefix = decodeBase64Url(encryption.noncePrefix);
  const whole = await createSHA256();
  const chunk = await createSHA256();
  const ciphertext = await createSHA256();
  whole.init();
  chunk.init();
  ciphertext.init();
  const frames = frameCount(file.size, encryption.framePlainBytes);
  let hashed = 0;

  for (let index = 0; index < frames; index++) {
    const layout = frameLayout(file.size, index, encryption.framePlainBytes, encryption.tagBytes);
    const plainBuffer = await file.slice(layout.plainOffset, layout.plainOffset + layout.plainSize).arrayBuffer();
    const plain = new Uint8Array(plainBuffer);
    whole.update(plain);
    chunk.update(plain);
    const encrypted = await encryptManagedFrame({ key, noncePrefix, fileId, fileSize: file.size, frameIndex: index, plaintext: plainBuffer });
    if (encrypted.byteLength !== layout.cipherSize) throw new Error("Encrypted frame size mismatch");
    ciphertext.update(encrypted);
    hashed += layout.plainSize;
    onProgress?.(Math.round((hashed / file.size) * 100));
  }

  return {
    sha256: whole.digest("hex"),
    chunkSha256: chunk.digest("hex"),
    ciphertextSha256: ciphertext.digest("hex"),
  };
}

function plainProgressForPhysicalOffset(file: File, encryption: EncryptionPlan, offset: number) {
  if (offset >= encryption.physicalSize) return file.size;
  if (offset <= 0) return 0;
  if (offset % CIPHER_FRAME_BYTES !== 0) throw new Error("Provider resume offset is not aligned to an encrypted frame boundary");
  const completedFrames = offset / CIPHER_FRAME_BYTES;
  return Math.min(file.size, completedFrames * encryption.framePlainBytes);
}

async function putEncryptedResumable(
  session: PlannedSession,
  file: File,
  fileId: string,
  encryption: EncryptionPlan,
  onPlainProgress: (acceptedPlainBytes: number) => void,
) {
  const key = await importManagedFileKey(encryption.key);
  const noncePrefix = decodeBase64Url(encryption.noncePrefix);
  let cursor = 0;
  let consecutiveFailures = 0;

  while (cursor < session.physicalSize) {
    if (cursor % CIPHER_FRAME_BYTES !== 0) throw new Error("Encrypted upload resume state is not frame aligned");
    const frameIndex = cursor / CIPHER_FRAME_BYTES;
    const layout = frameLayout(file.size, frameIndex, encryption.framePlainBytes, encryption.tagBytes);
    if (layout.cipherOffset !== cursor) throw new Error("Encrypted upload frame offset mismatch");
    const plainBuffer = await file.slice(layout.plainOffset, layout.plainOffset + layout.plainSize).arrayBuffer();
    const body = await encryptManagedFrame({ key, noncePrefix, fileId, fileSize: file.size, frameIndex, plaintext: plainBuffer });
    const end = cursor + body.byteLength;
    let response: Response | null = null;

    try {
      response = await fetch(session.uploadUrl, {
        method: "PUT",
        headers: { "Content-Range": `bytes ${cursor}-${end - 1}/${session.physicalSize}` },
        body,
      });
    } catch {
      consecutiveFailures++;
    }

    if (response?.ok) {
      onPlainProgress(file.size);
      const data = (await response.json()) as { id?: string };
      if (!data.id) throw new Error("Drive did not finalize encrypted upload");
      return data.id;
    }

    if (response?.status === 308) {
      const next = receivedOffset(response) ?? (await queryUploadState(session)).offset;
      if (next < cursor || next > session.physicalSize) throw new Error("Provider returned an invalid resume offset");
      cursor = next;
      onPlainProgress(plainProgressForPhysicalOffset(file, encryption, cursor));
      consecutiveFailures = 0;
      continue;
    }

    if (response && response.status < 500 && response.status !== 408 && response.status !== 409 && response.status !== 425 && response.status !== 429) {
      if (response.status === 404) throw new Error("Encrypted upload session expired");
      throw new Error(`Encrypted upload failed (${response.status})`);
    }

    consecutiveFailures++;
    if (consecutiveFailures > 5) throw new Error("Encrypted upload could not be resumed");
    await sleep(Math.min(8000, 400 * 2 ** consecutiveFailures));
    const state = await queryUploadState(session);
    if (state.done) {
      onPlainProgress(file.size);
      return state.driveFileId;
    }
    cursor = state.offset;
    onPlainProgress(plainProgressForPhysicalOffset(file, encryption, cursor));
  }

  const state = await queryUploadState(session);
  if (!state.done) throw new Error("Drive did not finalize encrypted upload");
  onPlainProgress(file.size);
  return state.driveFileId;
}

async function abortUpload(fileId: string, completed: CompletedChunk[]) {
  await fetch(`/api/uploads/${encodeURIComponent(fileId)}/abort`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ completed: completed.map(({ chunkId, driveFileId }) => ({ chunkId, driveFileId })) }),
  }).catch(() => undefined);
}

export async function uploadMeshlyFile(file: File, onProgress?: (value: Progress) => void, parentId?: string | null, accountId?: string) {
  onProgress?.({ phase: "planning", percent: 0 });
  const planResponse = await fetch("/api/uploads/plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, mimeType: file.type || "application/octet-stream", parentId: parentId ?? null, accountId }),
  });
  if (!planResponse.ok) {
    const data = (await planResponse.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Unable to plan upload");
  }
  const plan = (await planResponse.json()) as PlanResponse;
  if (plan.encryption?.version !== 1) throw new Error("Meshly refused to create an encrypted upload plan");
  if (plan.sessions.length !== 1 || plan.sessions[0]?.size !== file.size || plan.sessions[0]?.physicalSize !== plan.encryption.physicalSize) {
    throw new Error("Encrypted Google upload plan is invalid");
  }

  const completed: CompletedChunk[] = [];
  try {
    onProgress?.({ phase: "encrypting", percent: 0, part: 1, parts: 1 });
    const hashes = await prehashEncrypted(file, plan.fileId, plan.encryption, (percent) => {
      onProgress?.({ phase: "hashing", percent, part: 1, parts: 1 });
    });

    const session = plan.sessions[0]!;
    let acceptedPlain = 0;
    const driveFileId = await putEncryptedResumable(session, file, plan.fileId, plan.encryption, (bytes) => {
      acceptedPlain = Math.max(acceptedPlain, bytes);
      onProgress?.({ phase: "uploading", percent: Math.min(100, Math.round((acceptedPlain / file.size) * 100)), part: 1, parts: 1 });
    });
    completed.push({ chunkId: session.chunkId, driveFileId, sha256: hashes.chunkSha256, ciphertextSha256: hashes.ciphertextSha256 });

    onProgress?.({ phase: "verifying", percent: 100, parts: 1 });
    const commit = await fetch("/api/uploads/commit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileId: plan.fileId, sha256: hashes.sha256, chunks: completed }),
    });
    if (!commit.ok) {
      const data = (await commit.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "Remote encrypted-object verification failed");
    }
    onProgress?.({ phase: "done", percent: 100, parts: 1 });
    return commit.json() as Promise<{ ok: true; fileId: string; downloadUrl: string }>;
  } catch (error) {
    await abortUpload(plan.fileId, completed);
    throw error;
  }
}

async function ensureFolder(name: string, parentId: string | null) {
  const created = await fetch("/api/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, parentId }),
  });
  if (created.ok) {
    const data = (await created.json()) as { item?: { id: string } };
    if (data.item?.id) return data.item.id;
  }
  if (created.status !== 409) throw new Error(`Unable to create folder ${name}`);
  const query = new URLSearchParams({ scope: "folder", q: name });
  if (parentId) query.set("parentId", parentId);
  const found = await fetch(`/api/items?${query.toString()}`);
  if (!found.ok) throw new Error(`Unable to resolve folder ${name}`);
  const data = (await found.json()) as { items: { id: string; name: string; kind: string; parentId: string | null }[] };
  const exact = data.items.find((item) => item.kind === "folder" && item.name.toLocaleLowerCase() === name.toLocaleLowerCase() && item.parentId === (parentId ?? null));
  if (!exact) throw new Error(`Folder conflict for ${name}`);
  return exact.id;
}

export async function uploadMeshlyFolder(files: FileList, parentId: string | null, onFile?: (name: string, index: number, total: number, progress: Progress) => void) {
  const all = Array.from(files);
  const folders = new Map<string, string>();
  for (let index = 0; index < all.length; index++) {
    const file = all[index]!;
    const relative = file.webkitRelativePath || file.name;
    const parts = relative.split("/").filter(Boolean);
    const dirParts = parts.slice(0, -1);
    let current = parentId;
    let key = "";
    for (const segment of dirParts) {
      key += `/${segment}`;
      let id = folders.get(key);
      if (!id) {
        id = await ensureFolder(segment, current);
        folders.set(key, id);
      }
      current = id;
    }
    await uploadMeshlyFile(file, (progress) => onFile?.(file.name, index + 1, all.length, progress), current);
  }
  return { files: all.length, folders: folders.size };
}

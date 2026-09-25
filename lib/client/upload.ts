"use client";

import { createSHA256 } from "hash-wasm";

type PlannedSession = { chunkId: string; accountId: string; part: number; offset: number; size: number; uploadUrl: string };
type PlanResponse = { fileId: string; sessions: PlannedSession[] };
type Progress = { phase: "planning" | "hashing" | "uploading" | "verifying" | "done"; percent: number; part?: number; parts?: number };
type CompletedChunk = { chunkId: string; driveFileId: string; sha256: string };
const NETWORK_CHUNK = 8 * 1024 * 1024;

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
    headers: { "Content-Range": `bytes */${session.size}` },
  });
  if (response.ok) {
    const data = (await response.json()) as { id?: string };
    if (!data.id) throw new Error(`Drive finalized part ${session.part + 1} without an id`);
    return { done: true as const, driveFileId: data.id, offset: session.size };
  }
  if (response.status === 308) return { done: false as const, driveFileId: null, offset: receivedOffset(response) ?? 0 };
  if (response.status === 404) throw new Error(`Upload session for part ${session.part + 1} expired`);
  throw new Error(`Unable to query upload part ${session.part + 1} (${response.status})`);
}

async function hashSlice(file: File, start: number, size: number, whole?: Awaited<ReturnType<typeof createSHA256>>) {
  const hasher = await createSHA256();
  hasher.init();
  let cursor = 0;
  while (cursor < size) {
    const end = Math.min(cursor + NETWORK_CHUNK, size);
    const bytes = new Uint8Array(await file.slice(start + cursor, start + end).arrayBuffer());
    hasher.update(bytes);
    whole?.update(bytes);
    cursor = end;
  }
  return hasher.digest("hex");
}

async function putResumable(session: PlannedSession, file: File, onBytes: (n: number) => void) {
  let cursor = 0;
  let consecutiveFailures = 0;
  while (cursor < session.size) {
    const end = Math.min(cursor + NETWORK_CHUNK, session.size);
    const body = file.slice(session.offset + cursor, session.offset + end);
    let response: Response | null = null;
    try {
      response = await fetch(session.uploadUrl, {
        method: "PUT",
        headers: { "Content-Range": `bytes ${cursor}-${end - 1}/${session.size}` },
        body,
      });
    } catch {
      consecutiveFailures++;
    }

    if (response?.ok) {
      onBytes(Math.max(0, end - cursor));
      const data = (await response.json()) as { id?: string };
      if (!data.id) throw new Error(`Drive did not finalize part ${session.part + 1}`);
      return data.id;
    }

    if (response?.status === 308) {
      let next = receivedOffset(response);
      if (next === null) next = (await queryUploadState(session)).offset;
      onBytes(Math.max(0, next - cursor));
      cursor = next;
      consecutiveFailures = 0;
      continue;
    }

    if (response && response.status < 500 && response.status !== 408 && response.status !== 429) {
      if (response.status === 404) throw new Error(`Upload session for part ${session.part + 1} expired`);
      throw new Error(`Upload part ${session.part + 1} failed (${response.status})`);
    }

    consecutiveFailures++;
    if (consecutiveFailures > 5) throw new Error(`Upload part ${session.part + 1} could not be resumed`);
    await sleep(Math.min(8000, 400 * 2 ** consecutiveFailures));
    const state = await queryUploadState(session);
    if (state.done) {
      onBytes(Math.max(0, session.size - cursor));
      return state.driveFileId;
    }
    onBytes(Math.max(0, state.offset - cursor));
    cursor = state.offset;
  }
  const state = await queryUploadState(session);
  if (!state.done) throw new Error(`Drive did not finalize part ${session.part + 1}`);
  return state.driveFileId;
}

async function abortUpload(fileId: string, completed: CompletedChunk[]) {
  await fetch(`/api/uploads/${encodeURIComponent(fileId)}/abort`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ completed: completed.map(({ chunkId, driveFileId }) => ({ chunkId, driveFileId })) }),
  }).catch(() => undefined);
}

export async function uploadMeshlyFile(file: File, onProgress?: (value: Progress) => void, parentId?: string | null) {
  onProgress?.({ phase: "planning", percent: 0 });
  const planResponse = await fetch("/api/uploads/plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, mimeType: file.type || "application/octet-stream", parentId: parentId ?? null }),
  });
  if (!planResponse.ok) {
    const data = (await planResponse.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Unable to plan upload");
  }
  const plan = (await planResponse.json()) as PlanResponse;
  const completed: CompletedChunk[] = [];
  try {
    const whole = await createSHA256();
    whole.init();
    const hashes = new Map<string, string>();
    let hashed = 0;
    for (const session of plan.sessions) {
      const hash = await hashSlice(file, session.offset, session.size, whole);
      hashes.set(session.chunkId, hash);
      hashed += session.size;
      onProgress?.({ phase: "hashing", percent: Math.round((hashed / file.size) * 100), part: session.part + 1, parts: plan.sessions.length });
    }
    const wholeHash = whole.digest("hex");

    let uploaded = 0;
    for (const session of plan.sessions) {
      const driveFileId = await putResumable(session, file, (bytes) => {
        uploaded += bytes;
        onProgress?.({ phase: "uploading", percent: Math.min(100, Math.round((uploaded / file.size) * 100)), part: session.part + 1, parts: plan.sessions.length });
      });
      completed.push({ chunkId: session.chunkId, driveFileId, sha256: hashes.get(session.chunkId)! });
    }

    onProgress?.({ phase: "verifying", percent: 100, parts: plan.sessions.length });
    const commit = await fetch("/api/uploads/commit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileId: plan.fileId, sha256: wholeHash, chunks: completed }),
    });
    if (!commit.ok) throw new Error("Remote verification failed");
    onProgress?.({ phase: "done", percent: 100, parts: plan.sessions.length });
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

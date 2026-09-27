import http from "node:http";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const PORT = Number(process.env.PORT || 8080);
const TEMP_ROOT = process.env.TERABOX_WORKER_TEMP_DIR || "/tmp/meshly-terabox";
const APP_ORIGIN = requiredUrl("MESHLY_APP_ORIGIN").origin;
const INTERNAL_BASE_URL = requiredUrl("MESHLY_INTERNAL_BASE_URL").origin;
const SIGNING_KEY = requiredSecret("TERABOX_WORKER_SIGNING_KEY");
const INTERNAL_SECRET = requiredSecret("TERABOX_WORKER_INTERNAL_SECRET");
const PROVIDER_TIMEOUT_MS = positiveInt(process.env.TERABOX_PROVIDER_TIMEOUT_MS, 120_000);
const INTERNAL_TIMEOUT_MS = positiveInt(process.env.MESHLY_INTERNAL_TIMEOUT_MS, 30_000);
const OBJECT_ID = /^[A-Za-z0-9_-]{6,128}$/;
const HEX_64 = /^[a-f0-9]{64}$/i;

function requiredSecret(name) {
  const value = process.env[name];
  if (!value || value.length < 32) throw new Error(`${name} must be at least 32 characters`);
  return value;
}

function requiredUrl(name) {
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} is required`);
  const url = new URL(raw);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error(`${name} must use HTTPS outside localhost`);
  }
  return url;
}

function positiveInt(value, fallback) {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function corsHeaders() {
  return {
    "access-control-allow-origin": APP_ORIGIN,
    "access-control-allow-methods": "GET,PUT,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "Authorization,Content-Type,Content-Length",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { ...corsHeaders(), "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(body);
}

function tokenFrom(req) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) throw new HttpError(401, "missing_worker_token");
  return authorization.slice("Bearer ".length);
}

function verifyWorkerToken(token, expectedObjectId) {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new HttpError(401, "invalid_worker_token");
  const [body, signature] = parts;
  const expected = createHmac("sha256", SIGNING_KEY).update(body).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new HttpError(401, "invalid_worker_token");
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new HttpError(401, "invalid_worker_token");
  }
  if (
    payload?.v !== 1 || payload.objectId !== expectedObjectId || !OBJECT_ID.test(payload.objectId) ||
    typeof payload.fileId !== "string" || typeof payload.userId !== "string" ||
    !Number.isSafeInteger(payload.physicalSize) || payload.physicalSize <= 0 ||
    !Number.isSafeInteger(payload.frames) || payload.frames <= 0 || payload.frames > 10000 ||
    !Number.isSafeInteger(payload.maxPartBytes) || payload.maxPartBytes <= 0 ||
    !Number.isSafeInteger(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)
  ) throw new HttpError(401, "invalid_or_expired_worker_token");
  const expectedFrames = Math.ceil(payload.physicalSize / payload.maxPartBytes);
  if (expectedFrames !== payload.frames) throw new HttpError(401, "invalid_worker_frame_binding");
  return payload;
}

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function objectDir(objectId) {
  if (!OBJECT_ID.test(objectId)) throw new HttpError(400, "invalid_object_id");
  return join(TEMP_ROOT, objectId);
}

function partPath(objectId, index) {
  return join(objectDir(objectId), `part-${index}.bin`);
}

function metaPath(objectId) {
  return join(objectDir(objectId), "meta.json");
}

async function readMeta(objectId) {
  try {
    return JSON.parse(await readFile(metaPath(objectId), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function writeMeta(objectId, value) {
  await mkdir(objectDir(objectId), { recursive: true, mode: 0o700 });
  await writeFile(metaPath(objectId), JSON.stringify(value), { mode: 0o600 });
}

function sameBinding(meta, payload) {
  return meta?.objectId === payload.objectId && meta?.fileId === payload.fileId && meta?.userId === payload.userId &&
    meta?.physicalSize === payload.physicalSize && meta?.frames === payload.frames && meta?.maxPartBytes === payload.maxPartBytes;
}

async function readRaw(req, maxBytes, exactBytes) {
  const declared = req.headers["content-length"] ? Number(req.headers["content-length"]) : null;
  if (declared !== null && (!Number.isSafeInteger(declared) || declared !== exactBytes)) throw new HttpError(400, "part_size_mismatch");
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += bytes.length;
    if (total > maxBytes || total > exactBytes) throw new HttpError(413, "part_too_large");
    chunks.push(bytes);
  }
  if (total !== exactBytes) throw new HttpError(400, "part_size_mismatch");
  return Buffer.concat(chunks, total);
}

async function readJson(req, maxBytes = 64 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += bytes.length;
    if (total > maxBytes) throw new HttpError(413, "request_too_large");
    chunks.push(bytes);
  }
  try {
    return JSON.parse(Buffer.concat(chunks, total).toString("utf8"));
  } catch {
    throw new HttpError(400, "invalid_json");
  }
}

async function internalPost(pathname, body) {
  const response = await fetch(`${INTERNAL_BASE_URL}${pathname}`, {
    method: "POST",
    headers: { authorization: `Bearer ${INTERNAL_SECRET}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(INTERNAL_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpError(502, typeof payload?.error === "string" ? payload.error : "meshly_internal_request_failed");
  return payload;
}

async function handlePart(req, res, objectId, indexText) {
  const payload = verifyWorkerToken(tokenFrom(req), objectId);
  const index = Number(indexText);
  if (!Number.isSafeInteger(index) || index < 0 || index >= payload.frames) throw new HttpError(400, "invalid_part_index");
  const expectedSize = index < payload.frames - 1
    ? payload.maxPartBytes
    : payload.physicalSize - payload.maxPartBytes * (payload.frames - 1);
  if (!Number.isSafeInteger(expectedSize) || expectedSize <= 0 || expectedSize > payload.maxPartBytes) throw new HttpError(400, "invalid_part_binding");

  const existingMeta = await readMeta(objectId);
  const meta = existingMeta ?? {
    v: 1,
    objectId: payload.objectId,
    fileId: payload.fileId,
    userId: payload.userId,
    physicalSize: payload.physicalSize,
    frames: payload.frames,
    maxPartBytes: payload.maxPartBytes,
    parts: [],
    createdAt: new Date().toISOString(),
  };
  if (!sameBinding(meta, payload)) throw new HttpError(409, "worker_upload_binding_mismatch");
  const existingPart = meta.parts[index];
  if (existingPart) {
    if (existingPart.size !== expectedSize) throw new HttpError(409, "existing_part_size_mismatch");
    return sendJson(res, 200, { ok: true, part: index, size: existingPart.size, md5: existingPart.md5, alreadyStored: true });
  }
  if (index !== meta.parts.length) throw new HttpError(409, "parts_must_be_uploaded_sequentially");

  const bytes = await readRaw(req, payload.maxPartBytes, expectedSize);
  const md5 = createHash("md5").update(bytes).digest("hex");
  await mkdir(objectDir(objectId), { recursive: true, mode: 0o700 });
  await writeFile(partPath(objectId, index), bytes, { mode: 0o600 });
  meta.parts.push({ index, size: bytes.length, md5 });
  meta.updatedAt = new Date().toISOString();
  await writeMeta(objectId, meta);
  sendJson(res, 200, { ok: true, part: index, size: bytes.length, md5 });
}

async function combinedHashes(objectId, meta) {
  const sha256 = createHash("sha256");
  const md5 = createHash("md5");
  let total = 0;
  for (let index = 0; index < meta.frames; index += 1) {
    const bytes = await readFile(partPath(objectId, index));
    total += bytes.length;
    sha256.update(bytes);
    md5.update(bytes);
  }
  return { total, sha256: sha256.digest("hex"), md5: md5.digest("hex") };
}

async function uploadProviderPart(url, bytes, index, expectedMd5) {
  const form = new FormData();
  form.set("file", new Blob([bytes]), `part-${index}.bin`);
  const response = await fetch(url, { method: "POST", body: form, signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (typeof payload?.errno === "number" && payload.errno !== 0)) throw new HttpError(502, "terabox_worker_part_upload_failed");
  if (typeof payload?.md5 !== "string" || payload.md5.toLowerCase() !== expectedMd5.toLowerCase()) {
    throw new HttpError(409, "terabox_worker_remote_part_md5_mismatch");
  }
}

async function handleCommit(req, res, objectId) {
  const payload = verifyWorkerToken(tokenFrom(req), objectId);
  const input = await readJson(req);
  if (typeof input?.ciphertextSha256 !== "string" || !HEX_64.test(input.ciphertextSha256)) throw new HttpError(400, "invalid_ciphertext_sha256");
  const meta = await readMeta(objectId);
  if (!meta || !sameBinding(meta, payload)) throw new HttpError(409, "worker_upload_not_initialized");
  if (!Array.isArray(meta.parts) || meta.parts.length !== payload.frames) throw new HttpError(409, "worker_upload_incomplete");
  if (meta.parts.some((part, index) => part?.index !== index || typeof part?.md5 !== "string" || !/^[a-f0-9]{32}$/i.test(part.md5))) {
    throw new HttpError(409, "worker_part_manifest_invalid");
  }

  const combined = await combinedHashes(objectId, meta);
  if (combined.total !== payload.physicalSize) throw new HttpError(409, "worker_ciphertext_size_mismatch");
  if (combined.sha256.toLowerCase() !== input.ciphertextSha256.toLowerCase()) throw new HttpError(409, "worker_ciphertext_sha256_mismatch");
  const blockMd5 = meta.parts.map((part) => part.md5.toLowerCase());
  const prepared = await internalPost(`/api/internal/terabox-worker/${encodeURIComponent(objectId)}/prepare`, { blockMd5, ciphertextMd5: combined.md5 });
  if (!prepared?.alreadyUploaded) {
    if (typeof prepared?.uploadId !== "string" || !Array.isArray(prepared?.partUrls) || prepared.partUrls.length !== payload.frames) {
      throw new HttpError(502, "terabox_worker_invalid_prepare_response");
    }
    for (let index = 0; index < payload.frames; index += 1) {
      const url = prepared.partUrls[index];
      if (typeof url !== "string" || !url.startsWith("https://")) throw new HttpError(502, "terabox_worker_invalid_part_target");
      const bytes = await readFile(partPath(objectId, index));
      await uploadProviderPart(url, bytes, index, blockMd5[index]);
    }
    await internalPost(`/api/internal/terabox-worker/${encodeURIComponent(objectId)}/finish`, {
      uploadId: prepared.uploadId,
      blockMd5,
      ciphertextMd5: combined.md5,
    });
  }
  await rm(objectDir(objectId), { recursive: true, force: true });
  sendJson(res, 200, { ok: true, uploadedBytes: payload.physicalSize, ciphertextSha256: combined.sha256 });
}

async function handleAbort(req, res, objectId) {
  verifyWorkerToken(tokenFrom(req), objectId);
  await rm(objectDir(objectId), { recursive: true, force: true });
  sendJson(res, 200, { ok: true });
}

async function route(req, res) {
  const origin = req.headers.origin;
  if (origin && origin !== APP_ORIGIN) throw new HttpError(403, "origin_not_allowed");
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    return res.end();
  }
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/health") return sendJson(res, 200, { ok: true, service: "meshly-terabox-worker" });

  const partMatch = url.pathname.match(/^\/v1\/terabox\/([A-Za-z0-9_-]{6,128})\/parts\/(\d+)$/);
  if (req.method === "PUT" && partMatch) return handlePart(req, res, partMatch[1], partMatch[2]);
  const commitMatch = url.pathname.match(/^\/v1\/terabox\/([A-Za-z0-9_-]{6,128})\/commit$/);
  if (req.method === "POST" && commitMatch) return handleCommit(req, res, commitMatch[1]);
  const uploadMatch = url.pathname.match(/^\/v1\/terabox\/([A-Za-z0-9_-]{6,128})$/);
  if (req.method === "DELETE" && uploadMatch) return handleAbort(req, res, uploadMatch[1]);
  throw new HttpError(404, "not_found");
}

await mkdir(TEMP_ROOT, { recursive: true, mode: 0o700 });
const server = http.createServer((req, res) => {
  void route(req, res).catch((error) => {
    const status = error instanceof HttpError ? error.status : 500;
    const code = error instanceof HttpError ? error.code : "worker_internal_error";
    if (!(error instanceof HttpError)) console.error("TeraBox worker request failed", error);
    if (!res.headersSent) sendJson(res, status, { error: code }); else res.destroy();
  });
});
server.requestTimeout = Math.max(PROVIDER_TIMEOUT_MS + 30_000, 180_000);
server.headersTimeout = 30_000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Meshly TeraBox worker listening on port ${PORT}`);
});

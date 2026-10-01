import { createHmac, timingSafeEqual } from "node:crypto";

export const TERABOX_MULTIPART_MIN_PART_BYTES = 4 * 1024 * 1024;
export const TERABOX_WORKER_TARGET_PART_BYTES = 8 * 1024 * 1024;
const TERABOX_WORKER_MAX_PARTS = 10_000;

export type TeraBoxWorkerPartPlan = {
  frames: number;
  maxPartBytes: number;
  lastPartBytes: number;
};

export type TeraBoxWorkerTokenPayload = {
  v: 1;
  objectId: string;
  fileId: string;
  userId: string;
  physicalSize: number;
  frames: number;
  maxPartBytes: number;
  exp: number;
};

type WorkerConfig = {
  url: string;
  signingKey: string;
  internalSecret: string;
};

export function planTeraBoxWorkerParts(physicalSize: number): TeraBoxWorkerPartPlan {
  if (!Number.isSafeInteger(physicalSize) || physicalSize <= 0) throw new Error("Invalid TeraBox worker ciphertext size");

  let frames = Math.max(1, Math.ceil(physicalSize / TERABOX_WORKER_TARGET_PART_BYTES));
  if (frames > TERABOX_WORKER_MAX_PARTS) throw new Error("TeraBox worker upload exceeds the transport part safety limit");

  while (frames > 1) {
    const maxPartBytes = Math.ceil(physicalSize / frames);
    const lastPartBytes = physicalSize - maxPartBytes * (frames - 1);
    if (maxPartBytes > TERABOX_MULTIPART_MIN_PART_BYTES && lastPartBytes > TERABOX_MULTIPART_MIN_PART_BYTES) {
      return { frames, maxPartBytes, lastPartBytes };
    }
    frames--;
  }

  return { frames: 1, maxPartBytes: physicalSize, lastPartBytes: physicalSize };
}

function workerConfig(): WorkerConfig {
  const url = process.env.TERABOX_WORKER_URL?.trim().replace(/\/$/, "");
  const signingKey = process.env.TERABOX_WORKER_SIGNING_KEY;
  const internalSecret = process.env.TERABOX_WORKER_INTERNAL_SECRET;
  if (!url || !signingKey || !internalSecret) throw new Error("TeraBox large-file worker is not configured");
  if (signingKey.length < 32 || internalSecret.length < 32) throw new Error("TeraBox worker secrets must be at least 32 characters");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    throw new Error("TeraBox worker URL must use HTTPS outside localhost");
  }
  return { url, signingKey, internalSecret };
}

export function isTeraBoxLargeWorkerEnabled() {
  if (process.env.TERABOX_LARGE_WORKER_ENABLED !== "true") return false;
  try {
    workerConfig();
    return true;
  } catch {
    return false;
  }
}

export function getTeraBoxWorkerUrl() {
  return workerConfig().url;
}

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signBody(body: string, key: string) {
  return createHmac("sha256", key).update(body).digest("base64url");
}

export function createTeraBoxWorkerToken(payload: Omit<TeraBoxWorkerTokenPayload, "v">) {
  const { signingKey } = workerConfig();
  const body = encode({ ...payload, v: 1 });
  return `${body}.${signBody(body, signingKey)}`;
}

export function verifyTeraBoxWorkerToken(token: string, nowSeconds = Math.floor(Date.now() / 1000)): TeraBoxWorkerTokenPayload {
  const { signingKey } = workerConfig();
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) throw new Error("Invalid TeraBox worker token");
  const expected = signBody(body, signingKey);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error("Invalid TeraBox worker token signature");
  }
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<TeraBoxWorkerTokenPayload>;
  if (
    payload.v !== 1 ||
    typeof payload.objectId !== "string" || !payload.objectId ||
    typeof payload.fileId !== "string" || !payload.fileId ||
    typeof payload.userId !== "string" || !payload.userId ||
    !Number.isSafeInteger(payload.physicalSize) || Number(payload.physicalSize) <= 0 ||
    !Number.isSafeInteger(payload.frames) || Number(payload.frames) <= 0 || Number(payload.frames) > TERABOX_WORKER_MAX_PARTS ||
    !Number.isSafeInteger(payload.maxPartBytes) || Number(payload.maxPartBytes) <= 0 ||
    !Number.isSafeInteger(payload.exp) || Number(payload.exp) <= nowSeconds
  ) throw new Error("Invalid or expired TeraBox worker token payload");

  const planned = planTeraBoxWorkerParts(Number(payload.physicalSize));
  if (planned.frames !== payload.frames || planned.maxPartBytes !== payload.maxPartBytes) {
    throw new Error("Invalid TeraBox worker transport layout");
  }
  return payload as TeraBoxWorkerTokenPayload;
}

export function requireTeraBoxWorkerInternalAuthorization(authorization: string | null) {
  const { internalSecret } = workerConfig();
  const expected = `Bearer ${internalSecret}`;
  if (!authorization) return false;
  const actualBuffer = Buffer.from(authorization);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

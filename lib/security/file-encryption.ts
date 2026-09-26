import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { AES_GCM_TAG_BYTES, NONCE_PREFIX_BYTES, PLAIN_FRAME_BYTES, encryptedPhysicalSize } from "../storage/encryption-format";

const WRAP_VERSION = "fk1";
const WRAP_INFO = Buffer.from("meshly:file-key-wrap:v1", "utf8");

function rootKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is required");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as base64");
  return decoded;
}

function wrapKey() {
  return Buffer.from(hkdfSync("sha256", rootKey(), Buffer.alloc(0), WRAP_INFO, 32));
}

export function wrapFileKey(rawFileKey: Uint8Array, fileId: string) {
  if (rawFileKey.byteLength !== 32) throw new Error("File encryption key must be 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", wrapKey(), iv);
  cipher.setAAD(Buffer.from(`meshly:file-key:${fileId}`, "utf8"));
  const encrypted = Buffer.concat([cipher.update(rawFileKey), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [WRAP_VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function unwrapFileKey(value: string, fileId: string) {
  const [version, iv, tag, data] = value.split(".");
  if (version !== WRAP_VERSION || !iv || !tag || !data) throw new Error("Invalid wrapped file key");
  const decipher = createDecipheriv("aes-256-gcm", wrapKey(), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(`meshly:file-key:${fileId}`, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const raw = Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]);
  if (raw.length !== 32) throw new Error("Invalid unwrapped file key length");
  return raw;
}

export function createManagedFileEncryption(fileId: string, logicalSize: number) {
  const rawKey = randomBytes(32);
  const noncePrefix = randomBytes(NONCE_PREFIX_BYTES);
  return {
    version: 1 as const,
    rawKey,
    rawKeyBase64Url: rawKey.toString("base64url"),
    wrappedFileKey: wrapFileKey(rawKey, fileId),
    noncePrefix,
    noncePrefixBase64Url: noncePrefix.toString("base64url"),
    framePlainBytes: PLAIN_FRAME_BYTES,
    tagBytes: AES_GCM_TAG_BYTES,
    physicalSize: encryptedPhysicalSize(logicalSize, PLAIN_FRAME_BYTES, AES_GCM_TAG_BYTES),
  };
}

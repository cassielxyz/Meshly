export const MESHLY_FILE_ENCRYPTION_VERSION = 1 as const;
export const AES_GCM_TAG_BYTES = 16;
export const CIPHER_FRAME_BYTES = 8 * 1024 * 1024;
export const PLAIN_FRAME_BYTES = CIPHER_FRAME_BYTES - AES_GCM_TAG_BYTES;
export const NONCE_PREFIX_BYTES = 8;

export type FrameLayout = {
  index: number;
  plainOffset: number;
  plainSize: number;
  cipherOffset: number;
  cipherSize: number;
};

export function frameCount(fileSize: number, framePlainBytes = PLAIN_FRAME_BYTES) {
  assertFileSize(fileSize);
  if (!Number.isSafeInteger(framePlainBytes) || framePlainBytes <= 0) throw new Error("Invalid encryption frame size");
  return Math.ceil(fileSize / framePlainBytes);
}

export function encryptedPhysicalSize(fileSize: number, framePlainBytes = PLAIN_FRAME_BYTES, tagBytes = AES_GCM_TAG_BYTES) {
  const count = frameCount(fileSize, framePlainBytes);
  const total = fileSize + count * tagBytes;
  if (!Number.isSafeInteger(total)) throw new Error("Encrypted file size exceeds safe integer range");
  return total;
}

export function frameLayout(fileSize: number, index: number, framePlainBytes = PLAIN_FRAME_BYTES, tagBytes = AES_GCM_TAG_BYTES): FrameLayout {
  const count = frameCount(fileSize, framePlainBytes);
  if (!Number.isSafeInteger(index) || index < 0 || index >= count) throw new Error("Invalid encryption frame index");
  const plainOffset = index * framePlainBytes;
  const plainSize = Math.min(framePlainBytes, fileSize - plainOffset);
  const cipherOffset = index * (framePlainBytes + tagBytes);
  return { index, plainOffset, plainSize, cipherOffset, cipherSize: plainSize + tagBytes };
}

export function framesForPlainRange(fileSize: number, start: number, end: number, framePlainBytes = PLAIN_FRAME_BYTES) {
  assertFileSize(fileSize);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end >= fileSize) throw new Error("Invalid plaintext range");
  const first = Math.floor(start / framePlainBytes);
  const last = Math.floor(end / framePlainBytes);
  const indices: number[] = [];
  for (let index = first; index <= last; index++) indices.push(index);
  return indices;
}

export function frameIv(prefix: Uint8Array, index: number) {
  if (prefix.byteLength !== NONCE_PREFIX_BYTES) throw new Error("Invalid nonce prefix");
  if (!Number.isSafeInteger(index) || index < 0 || index > 0xffffffff) throw new Error("Encryption frame index exceeds nonce range");
  const iv = new Uint8Array(12);
  iv.set(prefix, 0);
  new DataView(iv.buffer).setUint32(8, index, false);
  return iv;
}

export function frameAad(fileId: string, fileSize: number, index: number) {
  if (!fileId) throw new Error("File id is required for encryption AAD");
  return new TextEncoder().encode(`meshly:file:v1:${fileId}:${fileSize}:${index}`);
}

function assertFileSize(fileSize: number) {
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0) throw new Error("File size must be a positive safe integer");
}

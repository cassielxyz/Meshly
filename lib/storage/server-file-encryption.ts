import { createDecipheriv } from "node:crypto";
import { AES_GCM_TAG_BYTES, frameAad, frameIv } from "@/lib/storage/encryption-format";

export function decryptManagedFrame(input: {
  rawKey: Uint8Array;
  noncePrefix: Uint8Array;
  fileId: string;
  fileSize: number;
  frameIndex: number;
  ciphertext: Uint8Array;
}) {
  if (input.rawKey.byteLength !== 32) throw new Error("Invalid managed file key");
  if (input.ciphertext.byteLength <= AES_GCM_TAG_BYTES) throw new Error("Encrypted frame is too small");
  const body = input.ciphertext.subarray(0, input.ciphertext.byteLength - AES_GCM_TAG_BYTES);
  const tag = input.ciphertext.subarray(input.ciphertext.byteLength - AES_GCM_TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", input.rawKey, frameIv(input.noncePrefix, input.frameIndex));
  decipher.setAAD(Buffer.from(frameAad(input.fileId, input.fileSize, input.frameIndex)));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}

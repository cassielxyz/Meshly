"use client";

import { frameAad, frameIv } from "@/lib/storage/encryption-format";

export function decodeBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function importManagedFileKey(value: string) {
  const bytes = decodeBase64Url(value);
  if (bytes.byteLength !== 32) throw new Error("Invalid Meshly file encryption key");
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt"]);
}

export async function encryptManagedFrame(input: {
  key: CryptoKey;
  noncePrefix: Uint8Array;
  fileId: string;
  fileSize: number;
  frameIndex: number;
  plaintext: ArrayBuffer;
}) {
  const encrypted = await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv: frameIv(input.noncePrefix, input.frameIndex),
    additionalData: frameAad(input.fileId, input.fileSize, input.frameIndex),
    tagLength: 128,
  }, input.key, input.plaintext);
  return new Uint8Array(encrypted);
}

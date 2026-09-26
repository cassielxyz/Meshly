import { describe, expect, it } from "vitest";
import { AES_GCM_TAG_BYTES, CIPHER_FRAME_BYTES, PLAIN_FRAME_BYTES, encryptedPhysicalSize, frameCount, frameIv, frameLayout, framesForPlainRange } from "./encryption-format";

describe("Meshly encrypted object framing", () => {
  it("keeps every full ciphertext frame aligned to 8 MiB", () => {
    const size = PLAIN_FRAME_BYTES * 2 + 123;
    expect(frameCount(size)).toBe(3);
    const first = frameLayout(size, 0);
    const second = frameLayout(size, 1);
    const last = frameLayout(size, 2);
    expect(first.cipherSize).toBe(CIPHER_FRAME_BYTES);
    expect(second.cipherOffset).toBe(CIPHER_FRAME_BYTES);
    expect(second.cipherSize).toBe(CIPHER_FRAME_BYTES);
    expect(last.cipherOffset).toBe(CIPHER_FRAME_BYTES * 2);
    expect(last.cipherSize).toBe(123 + AES_GCM_TAG_BYTES);
    expect(encryptedPhysicalSize(size)).toBe(size + 3 * AES_GCM_TAG_BYTES);
  });

  it("maps plaintext ranges to only the required authenticated frames", () => {
    const size = PLAIN_FRAME_BYTES * 3;
    expect(framesForPlainRange(size, 0, 10)).toEqual([0]);
    expect(framesForPlainRange(size, PLAIN_FRAME_BYTES - 2, PLAIN_FRAME_BYTES + 2)).toEqual([0, 1]);
    expect(framesForPlainRange(size, PLAIN_FRAME_BYTES * 2, size - 1)).toEqual([2]);
  });

  it("derives unique 96-bit IVs from the random prefix and frame index", () => {
    const prefix = Uint8Array.from([1,2,3,4,5,6,7,8]);
    const first = frameIv(prefix, 0);
    const second = frameIv(prefix, 1);
    expect(first.byteLength).toBe(12);
    expect(Array.from(first.slice(0, 8))).toEqual(Array.from(prefix));
    expect(Array.from(first)).not.toEqual(Array.from(second));
  });
});

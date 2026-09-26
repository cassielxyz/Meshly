import { createCipheriv, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { frameAad, frameIv } from "./encryption-format";
import { decryptManagedFrame } from "./server-file-encryption";

describe("managed frame decryption", () => {
  it("authenticates and decrypts one framed object segment", () => {
    const key = randomBytes(32);
    const prefix = randomBytes(8);
    const fileId = "file-test";
    const fileSize = 4096;
    const index = 0;
    const plaintext = randomBytes(fileSize);
    const cipher = createCipheriv("aes-256-gcm", key, frameIv(prefix, index));
    cipher.setAAD(Buffer.from(frameAad(fileId, fileSize, index)));
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
    expect(decryptManagedFrame({ rawKey: key, noncePrefix: prefix, fileId, fileSize, frameIndex: index, ciphertext })).toEqual(plaintext);
  });

  it("rejects modified ciphertext", () => {
    const key = randomBytes(32);
    const prefix = randomBytes(8);
    const fileId = "file-test";
    const fileSize = 64;
    const cipher = createCipheriv("aes-256-gcm", key, frameIv(prefix, 0));
    cipher.setAAD(Buffer.from(frameAad(fileId, fileSize, 0)));
    const ciphertext = Buffer.concat([cipher.update(randomBytes(fileSize)), cipher.final(), cipher.getAuthTag()]);
    ciphertext[0] ^= 1;
    expect(() => decryptManagedFrame({ rawKey: key, noncePrefix: prefix, fileId, fileSize, frameIndex: 0, ciphertext })).toThrow();
  });
});

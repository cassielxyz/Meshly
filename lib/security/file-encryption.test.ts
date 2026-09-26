import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createManagedFileEncryption, unwrapFileKey, wrapFileKey } from "./file-encryption";

const previous = process.env.TOKEN_ENCRYPTION_KEY;

beforeEach(() => {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});
afterEach(() => {
  if (previous === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
  else process.env.TOKEN_ENCRYPTION_KEY = previous;
});

describe("managed file key wrapping", () => {
  it("wraps and unwraps a 256-bit file key without storing the raw key", () => {
    const raw = randomBytes(32);
    const wrapped = wrapFileKey(raw, "file-a");
    expect(wrapped).not.toContain(raw.toString("base64url"));
    expect(unwrapFileKey(wrapped, "file-a")).toEqual(raw);
  });

  it("binds a wrapped key to its logical file id", () => {
    const wrapped = wrapFileKey(randomBytes(32), "file-a");
    expect(() => unwrapFileKey(wrapped, "file-b")).toThrow();
  });

  it("creates unique file keys and nonce prefixes", () => {
    const a = createManagedFileEncryption("a", 1000);
    const b = createManagedFileEncryption("b", 1000);
    expect(a.rawKeyBase64Url).not.toBe(b.rawKeyBase64Url);
    expect(a.noncePrefixBase64Url).not.toBe(b.noncePrefixBase64Url);
    expect(a.physicalSize).toBeGreaterThan(1000);
  });
});

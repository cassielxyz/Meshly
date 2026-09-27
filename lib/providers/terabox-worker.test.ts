import { afterEach, describe, expect, it } from "vitest";
import { createTeraBoxWorkerToken, isTeraBoxLargeWorkerEnabled, verifyTeraBoxWorkerToken } from "@/lib/providers/terabox-worker";

const saved = {
  enabled: process.env.TERABOX_LARGE_WORKER_ENABLED,
  url: process.env.TERABOX_WORKER_URL,
  signing: process.env.TERABOX_WORKER_SIGNING_KEY,
  internal: process.env.TERABOX_WORKER_INTERNAL_SECRET,
};

function configure() {
  process.env.TERABOX_LARGE_WORKER_ENABLED = "true";
  process.env.TERABOX_WORKER_URL = "https://worker.example.test";
  process.env.TERABOX_WORKER_SIGNING_KEY = "signing-key-that-is-long-enough-for-tests-123456";
  process.env.TERABOX_WORKER_INTERNAL_SECRET = "internal-secret-long-enough-for-tests-1234567";
}

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    const envKey = key === "enabled" ? "TERABOX_LARGE_WORKER_ENABLED" : key === "url" ? "TERABOX_WORKER_URL" : key === "signing" ? "TERABOX_WORKER_SIGNING_KEY" : "TERABOX_WORKER_INTERNAL_SECRET";
    if (value === undefined) delete process.env[envKey]; else process.env[envKey] = value;
  }
});

describe("TeraBox worker capabilities", () => {
  it("stays fail-closed without explicit activation", () => {
    configure();
    process.env.TERABOX_LARGE_WORKER_ENABLED = "false";
    expect(isTeraBoxLargeWorkerEnabled()).toBe(false);
  });

  it("binds signed tokens to object, size and expiry", () => {
    configure();
    const token = createTeraBoxWorkerToken({
      objectId: "obj_1",
      fileId: "file_1",
      userId: "user_1",
      physicalSize: 10_000_000,
      frames: 2,
      maxPartBytes: 8_388_624,
      exp: 2_000_000_000,
    });
    expect(verifyTeraBoxWorkerToken(token, 1_900_000_000)).toMatchObject({ objectId: "obj_1", fileId: "file_1", physicalSize: 10_000_000, frames: 2 });
    expect(() => verifyTeraBoxWorkerToken(`${token.slice(0, -1)}x`, 1_900_000_000)).toThrow();
    expect(() => verifyTeraBoxWorkerToken(token, 2_000_000_000)).toThrow(/expired/i);
  });
});

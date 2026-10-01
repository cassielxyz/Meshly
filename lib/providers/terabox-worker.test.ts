import { afterEach, describe, expect, it } from "vitest";
import {
  createTeraBoxWorkerToken,
  isTeraBoxLargeWorkerEnabled,
  planTeraBoxWorkerParts,
  TERABOX_MULTIPART_MIN_PART_BYTES,
  verifyTeraBoxWorkerToken,
} from "@/lib/providers/terabox-worker";

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

  it("keeps every fragment above the provider minimum when multipart is used", () => {
    const min = TERABOX_MULTIPART_MIN_PART_BYTES;
    expect(planTeraBoxWorkerParts(8 * 1024 * 1024 + 1)).toEqual({
      frames: 1,
      maxPartBytes: 8 * 1024 * 1024 + 1,
      lastPartBytes: 8 * 1024 * 1024 + 1,
    });

    const boundary = planTeraBoxWorkerParts(8 * 1024 * 1024 + 2);
    expect(boundary.frames).toBe(2);
    expect(boundary.maxPartBytes).toBeGreaterThan(min);
    expect(boundary.lastPartBytes).toBeGreaterThan(min);

    for (const size of [10_000_000, 25_000_000, 100_000_000, 1024 * 1024 * 1024]) {
      const plan = planTeraBoxWorkerParts(size);
      expect(Math.ceil(size / plan.maxPartBytes)).toBe(plan.frames);
      expect(size - plan.maxPartBytes * (plan.frames - 1)).toBe(plan.lastPartBytes);
      if (plan.frames > 1) {
        expect(plan.maxPartBytes).toBeGreaterThan(min);
        expect(plan.lastPartBytes).toBeGreaterThan(min);
      }
    }
  });

  it("binds signed tokens to the provider-safe transport layout and expiry", () => {
    configure();
    const layout = planTeraBoxWorkerParts(10_000_000);
    const token = createTeraBoxWorkerToken({
      objectId: "obj_1",
      fileId: "file_1",
      userId: "user_1",
      physicalSize: 10_000_000,
      frames: layout.frames,
      maxPartBytes: layout.maxPartBytes,
      exp: 2_000_000_000,
    });
    expect(verifyTeraBoxWorkerToken(token, 1_900_000_000)).toMatchObject({ objectId: "obj_1", fileId: "file_1", physicalSize: 10_000_000, frames: layout.frames });
    expect(() => verifyTeraBoxWorkerToken(`${token.slice(0, -1)}x`, 1_900_000_000)).toThrow();
    expect(() => verifyTeraBoxWorkerToken(token, 2_000_000_000)).toThrow(/expired/i);

    const unsafeToken = createTeraBoxWorkerToken({
      objectId: "obj_2",
      fileId: "file_2",
      userId: "user_1",
      physicalSize: 10_000_000,
      frames: 2,
      maxPartBytes: 8_388_624,
      exp: 2_000_000_000,
    });
    expect(() => verifyTeraBoxWorkerToken(unsafeToken, 1_900_000_000)).toThrow(/transport layout/i);
  });
});

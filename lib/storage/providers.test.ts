import { describe, expect, it } from "vitest";
import { getStorageProvider, storageProviders } from "./providers";
import { nextUploadConcurrency, retryDelayMs, shouldRetryTransfer } from "./transfer-policy";

describe("storage provider registry", () => {
  it("keeps Google Drive in its own section and whole-file only", () => {
    const google = getStorageProvider("google-drive");
    expect(google.section).toBe("google");
    expect(google.capabilities.wholeFilePlacementOnly).toBe(true);
    expect(google.capabilities.distributedStorageParts).toBe(false);
  });

  it("requires encryption for every provider", () => {
    expect(storageProviders.every((provider) => provider.capabilities.encryptionRequired)).toBe(true);
  });

  it("uses a conservative sequential TeraBox upload profile", () => {
    const terabox = getStorageProvider("terabox");
    expect(terabox.transfer.maxActiveUploads).toBe(1);
    expect(terabox.transfer.uploadPartConcurrency).toBe(1);
    expect(terabox.transfer.adaptiveConcurrency).toBe(false);
  });
});

describe("provider-aware transfer policy", () => {
  it("increases adaptive concurrency only up to the provider limit", () => {
    const profile = getStorageProvider("google-drive").transfer;
    expect(nextUploadConcurrency(profile, 1, "success")).toBe(2);
    expect(nextUploadConcurrency(profile, 3, "success")).toBe(3);
  });

  it("backs off after throttling", () => {
    const profile = getStorageProvider("google-drive").transfer;
    expect(nextUploadConcurrency(profile, 3, "throttled")).toBe(2);
  });

  it("never raises concurrency for fixed providers", () => {
    const profile = getStorageProvider("terabox").transfer;
    expect(nextUploadConcurrency(profile, 8, "success")).toBe(1);
  });

  it("uses bounded exponential retry delays and respects Retry-After", () => {
    expect(retryDelayMs(0)).toBe(400);
    expect(retryDelayMs(20)).toBe(30_000);
    expect(retryDelayMs(2, 12_000)).toBe(12_000);
    expect(retryDelayMs(2, 120_000)).toBe(60_000);
  });

  it("retries throttling, timeout, conflicts and server failures", () => {
    expect(shouldRetryTransfer(429)).toBe(true);
    expect(shouldRetryTransfer(503)).toBe(true);
    expect(shouldRetryTransfer(400)).toBe(false);
  });
});

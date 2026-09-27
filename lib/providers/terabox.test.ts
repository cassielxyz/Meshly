import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getTeraBoxManagedPath,
  isTeraBoxManagedUploadsEnabled,
  TERABOX_SERVERLESS_MAX_CIPHERTEXT_BYTES,
} from "./terabox";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("TeraBox managed transfer safety", () => {
  it("keeps managed uploads disabled without the explicit production gate", () => {
    vi.stubEnv("TERABOX_CLIENT_ID", "client");
    vi.stubEnv("TERABOX_CLIENT_SECRET", "secret");
    vi.stubEnv("TERABOX_PRIVATE_SECRET", "private");
    vi.stubEnv("TERABOX_APP_ROOT", "/apps/meshly");
    vi.stubEnv("TERABOX_MANAGED_UPLOADS_ENABLED", "false");
    expect(isTeraBoxManagedUploadsEnabled()).toBe(false);
  });

  it("requires provider credentials, app root and explicit gate together", () => {
    vi.stubEnv("TERABOX_CLIENT_ID", "client");
    vi.stubEnv("TERABOX_CLIENT_SECRET", "secret");
    vi.stubEnv("TERABOX_PRIVATE_SECRET", "private");
    vi.stubEnv("TERABOX_APP_ROOT", "/apps/meshly/");
    vi.stubEnv("TERABOX_MANAGED_UPLOADS_ENABLED", "true");
    expect(isTeraBoxManagedUploadsEnabled()).toBe(true);
  });

  it("builds opaque managed paths only inside the configured app root", () => {
    vi.stubEnv("TERABOX_APP_ROOT", "apps/meshly/");
    expect(getTeraBoxManagedPath("msh_A1-b2_C3.bin")).toBe("/apps/meshly/Meshly Storage/msh_A1-b2_C3.bin");
    expect(() => getTeraBoxManagedPath("private-photo.jpg")).toThrow("Invalid TeraBox physical object name");
    expect(() => getTeraBoxManagedPath("../msh_escape.bin")).toThrow("Invalid TeraBox physical object name");
  });

  it("keeps the serverless beta body ceiling at three MiB ciphertext", () => {
    expect(TERABOX_SERVERLESS_MAX_CIPHERTEXT_BYTES).toBe(3 * 1024 * 1024);
  });
});

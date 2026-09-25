import { afterEach, describe, expect, it, vi } from "vitest";
import { checkServerEnv } from "./env";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
  vi.unstubAllEnvs();
});

describe("server environment validation", () => {
  it("reports missing production configuration without leaking values", () => {
    for (const key of ["DATABASE_URL","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","GOOGLE_REDIRECT_URI","SESSION_SECRET","TOKEN_ENCRYPTION_KEY","RECOVERY_SECRET","SHARE_GRANT_SECRET","CRON_SECRET","NEXT_PUBLIC_APP_URL"]) delete process.env[key];
    const result = checkServerEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain("DATABASE_URL");
      expect(result.missing).toContain("SESSION_SECRET");
    }
  });
});

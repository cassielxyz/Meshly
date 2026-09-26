import { afterEach, describe, expect, it, vi } from "vitest";
import { checkServerEnv } from "./env";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
  vi.unstubAllEnvs();
});

function useValidEnv() {
  Object.assign(process.env, {
    DATABASE_URL: "postgresql://meshly:secret@localhost:5432/meshly",
    GOOGLE_CLIENT_ID: "123456789012-example.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "google-client-secret-value",
    GOOGLE_REDIRECT_URI: "http://localhost:3000/api/auth/google/callback",
    SESSION_SECRET: "session-secret-".padEnd(48, "s"),
    TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    RECOVERY_SECRET: "recovery-secret-".padEnd(48, "r"),
    SHARE_GRANT_SECRET: "share-grant-secret-".padEnd(48, "g"),
    CRON_SECRET: "cron-secret-".padEnd(48, "c"),
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  });
}

describe("server environment validation", () => {
  it("reports missing production configuration without leaking values", () => {
    for (const key of ["DATABASE_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI", "SESSION_SECRET", "TOKEN_ENCRYPTION_KEY", "RECOVERY_SECRET", "SHARE_GRANT_SECRET", "CRON_SECRET", "NEXT_PUBLIC_APP_URL"]) delete process.env[key];
    const result = checkServerEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain("DATABASE_URL");
      expect(result.missing).toContain("SESSION_SECRET");
    }
  });

  it("accepts a complete localhost development configuration", () => {
    useValidEnv();
    expect(checkServerEnv().ok).toBe(true);
  });

  it("requires TOKEN_ENCRYPTION_KEY to decode to exactly 32 bytes", () => {
    useValidEnv();
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(31, 7).toString("base64");
    const result = checkServerEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toContain("TOKEN_ENCRYPTION_KEY");
  });

  it("requires the Google callback to match the app origin and exact callback path", () => {
    useValidEnv();
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3001/api/auth/google/callback";
    let result = checkServerEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toContain("GOOGLE_REDIRECT_URI");

    useValidEnv();
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/not-the-callback";
    result = checkServerEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toContain("GOOGLE_REDIRECT_URI");
  });

  it("requires HTTPS for non-localhost public origins", () => {
    useValidEnv();
    process.env.NEXT_PUBLIC_APP_URL = "http://meshly.example";
    process.env.GOOGLE_REDIRECT_URI = "http://meshly.example/api/auth/google/callback";
    const result = checkServerEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain("NEXT_PUBLIC_APP_URL");
      expect(result.missing).toContain("GOOGLE_REDIRECT_URI");
    }
  });

  it("rejects secret reuse across security purposes", () => {
    useValidEnv();
    process.env.CRON_SECRET = process.env.RECOVERY_SECRET;
    const result = checkServerEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toContain("CRON_SECRET");
  });
});

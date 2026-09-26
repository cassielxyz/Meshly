import { z } from "zod";

const secret = z.string().min(32);

function isLocalHost(hostname: string) {
  return ["localhost", "127.0.0.1", "::1"].includes(hostname);
}

function isValidTokenEncryptionKey(value: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return false;
  try {
    const decoded = Buffer.from(value, "base64");
    return decoded.length === 32 && decoded.toString("base64") === value;
  } catch {
    return false;
  }
}

const serverEnvSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .url()
      .refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), "DATABASE_URL must be PostgreSQL"),
    GOOGLE_CLIENT_ID: z.string().min(10),
    GOOGLE_CLIENT_SECRET: z.string().min(10),
    GOOGLE_REDIRECT_URI: z.string().url(),
    SESSION_SECRET: secret,
    TOKEN_ENCRYPTION_KEY: z.string().refine(isValidTokenEncryptionKey, "TOKEN_ENCRYPTION_KEY must be exactly 32 random bytes encoded as canonical base64"),
    RECOVERY_SECRET: secret,
    SHARE_GRANT_SECRET: secret,
    CRON_SECRET: secret,
    NEXT_PUBLIC_APP_URL: z.string().url(),
  })
  .superRefine((env, ctx) => {
    const appUrl = new URL(env.NEXT_PUBLIC_APP_URL);
    const redirectUrl = new URL(env.GOOGLE_REDIRECT_URI);

    if (appUrl.protocol !== "https:" && !isLocalHost(appUrl.hostname)) {
      ctx.addIssue({ code: "custom", path: ["NEXT_PUBLIC_APP_URL"], message: "NEXT_PUBLIC_APP_URL must use HTTPS outside localhost" });
    }
    if (redirectUrl.protocol !== "https:" && !isLocalHost(redirectUrl.hostname)) {
      ctx.addIssue({ code: "custom", path: ["GOOGLE_REDIRECT_URI"], message: "GOOGLE_REDIRECT_URI must use HTTPS outside localhost" });
    }
    if (redirectUrl.origin !== appUrl.origin || redirectUrl.pathname !== "/api/auth/google/callback" || redirectUrl.search || redirectUrl.hash) {
      ctx.addIssue({
        code: "custom",
        path: ["GOOGLE_REDIRECT_URI"],
        message: "GOOGLE_REDIRECT_URI must be the exact /api/auth/google/callback URL on NEXT_PUBLIC_APP_URL",
      });
    }

    const purposeSecrets = [
      ["SESSION_SECRET", env.SESSION_SECRET],
      ["TOKEN_ENCRYPTION_KEY", env.TOKEN_ENCRYPTION_KEY],
      ["RECOVERY_SECRET", env.RECOVERY_SECRET],
      ["SHARE_GRANT_SECRET", env.SHARE_GRANT_SECRET],
      ["CRON_SECRET", env.CRON_SECRET],
    ] as const;
    const seen = new Map<string, string>();
    for (const [name, value] of purposeSecrets) {
      const previous = seen.get(value);
      if (previous) {
        ctx.addIssue({ code: "custom", path: [name], message: `${name} must not reuse ${previous}` });
      } else {
        seen.set(value, name);
      }
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function checkServerEnv() {
  const result = serverEnvSchema.safeParse(process.env);
  if (result.success) return { ok: true as const, data: result.data, missing: [] as string[] };
  const missing = [...new Set(result.error.issues.map((issue) => issue.path.join(".") || "environment"))];
  return { ok: false as const, missing, error: result.error };
}

export function requireServerEnv(): ServerEnv {
  const result = checkServerEnv();
  if (!result.ok) throw new Error(`Meshly environment is incomplete: ${result.missing.join(", ")}`);
  return result.data;
}

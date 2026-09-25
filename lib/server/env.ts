import { z } from "zod";

const secret = z.string().min(32);
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url().refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), "DATABASE_URL must be PostgreSQL"),
  GOOGLE_CLIENT_ID: z.string().min(10),
  GOOGLE_CLIENT_SECRET: z.string().min(10),
  GOOGLE_REDIRECT_URI: z.string().url(),
  SESSION_SECRET: secret,
  TOKEN_ENCRYPTION_KEY: z.string().min(40),
  RECOVERY_SECRET: secret,
  SHARE_GRANT_SECRET: secret,
  CRON_SECRET: secret,
  NEXT_PUBLIC_APP_URL: z.string().url(),
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

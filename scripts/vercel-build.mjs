import { spawnSync } from "node:child_process";

const isProduction = process.env.VERCEL_ENV === "production";
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (isProduction) {
  if (!hasDatabaseUrl) {
    console.error("Production Vercel build requires DATABASE_URL before migrations can run.");
    process.exit(1);
  }

  console.log("Running Meshly production database migrations before build...");
  run(process.execPath, ["scripts/migrate.mjs"]);
} else {
  console.log(`Skipping production migrations for VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}.`);
}

console.log("Building Meshly...");
run("next", ["build"]);

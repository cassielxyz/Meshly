import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });
const migrationsDir = path.join(process.cwd(), "db", "migrations");

try {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS _meshly_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();
  for (const name of files) {
    const source = await readFile(path.join(migrationsDir, name), "utf8");
    const checksum = createHash("sha256").update(source).digest("hex");
    const [existing] = await sql`SELECT checksum FROM _meshly_migrations WHERE name = ${name}`;
    if (existing) {
      if (existing.checksum !== checksum) throw new Error(`Applied migration ${name} was modified after deployment.`);
      console.log(`skip ${name}`);
      continue;
    }
    await sql.begin(async (tx) => {
      await tx.unsafe(source);
      await tx`INSERT INTO _meshly_migrations (name, checksum) VALUES (${name}, ${checksum})`;
    });
    console.log(`applied ${name}`);
  }
  console.log("Meshly database is up to date.");
} finally {
  await sql.end();
}

import { randomBytes } from "node:crypto";
import postgres from "postgres";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ROLLBACK_SENTINEL = "__MESHLY_MIGRATION_PROBE_ROLLBACK__";

function safeError(error: unknown) {
  const candidate = (error && typeof error === "object" ? error : {}) as Record<string, unknown>;
  const cause = candidate.cause && typeof candidate.cause === "object" ? candidate.cause as Record<string, unknown> : candidate;
  return {
    code: typeof cause.code === "string" ? cause.code : null,
    severity: typeof cause.severity === "string" ? cause.severity : null,
    routine: typeof cause.routine === "string" ? cause.routine : null,
    message: typeof cause.message === "string" ? cause.message.slice(0, 240) : "Database probe failed",
  };
}

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ ok: false, databaseConfigured: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }

  const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });
  const suffix = randomBytes(6).toString("hex");
  const tableName = `__meshly_probe_${suffix}`;
  const indexName = `__meshly_probe_idx_${suffix}`;

  try {
    const [info] = await sql<{
      schema_name: string | null;
      can_create_schema: boolean;
      migration_table_exists: boolean;
      users_table_exists: boolean;
    }[]>`
      select
        current_schema() as schema_name,
        has_schema_privilege(current_user, current_schema(), 'CREATE') as can_create_schema,
        to_regclass('public._meshly_migrations') is not null as migration_table_exists,
        to_regclass('public.users') is not null as users_table_exists
    `;

    let ddlTransaction = { ok: false as boolean, rolledBack: false, error: null as ReturnType<typeof safeError> | null };

    try {
      await sql.begin(async (tx) => {
        await tx.unsafe(`CREATE TABLE public.${tableName} (id text PRIMARY KEY, value text NOT NULL)`);
        await tx.unsafe(`ALTER TABLE public.${tableName} ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(); CREATE INDEX ${indexName} ON public.${tableName}(created_at);`);
        await tx.unsafe(`INSERT INTO public.${tableName} (id, value) VALUES ('probe', 'ok')`);
        throw new Error(ROLLBACK_SENTINEL);
      });
    } catch (error) {
      if (error instanceof Error && error.message === ROLLBACK_SENTINEL) {
        ddlTransaction.ok = true;
      } else {
        ddlTransaction.error = safeError(error);
      }
    }

    const [after] = await sql<{ exists_after_rollback: boolean }[]>`
      select to_regclass(${`public.${tableName}`}) is not null as exists_after_rollback
    `;
    ddlTransaction.rolledBack = !after?.exists_after_rollback;

    return NextResponse.json({
      ok: ddlTransaction.ok && ddlTransaction.rolledBack,
      databaseConfigured: true,
      schema: info?.schema_name ?? null,
      canCreateSchema: Boolean(info?.can_create_schema),
      migrationTableExists: Boolean(info?.migration_table_exists),
      usersTableExists: Boolean(info?.users_table_exists),
      ddlTransaction,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      databaseConfigured: true,
      probeError: safeError(error),
    }, { status: 503, headers: { "cache-control": "no-store" } });
  } finally {
    await sql.end({ timeout: 2 });
  }
}

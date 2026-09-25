import fs from "node:fs";
import process from "node:process";

function parseArgs(argv) {
  const result = { origin: process.env.MESHLY_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "", report: process.env.MESHLY_PREFLIGHT_REPORT || "" };
  let positionalOriginSeen = false;
  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--report=")) result.report = arg.slice("--report=".length);
    else if (!arg.startsWith("--") && !positionalOriginSeen) {
      result.origin = arg;
      positionalOriginSeen = true;
    }
  }
  return result;
}

function normalizeOrigin(value) {
  if (!value) throw new Error("Provide the deployed Meshly URL: pnpm production:preflight https://meshly.example");
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Meshly app URL must use http or https");
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("Production preflight requires HTTPS (HTTP is allowed only for localhost)");
  }
  return url.origin;
}

const { origin: rawOrigin, report: reportPath } = parseArgs(process.argv);
const origin = normalizeOrigin(rawOrigin);
const results = [];

async function check(id, run) {
  const started = Date.now();
  try {
    const details = await run();
    results.push({ id, status: "pass", durationMs: Date.now() - started, ...(details ? { details } : {}) });
    console.log(`PASS  ${id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ id, status: "fail", durationMs: Date.now() - started, error: message });
    console.error(`FAIL  ${id}: ${message}`);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchNoFollow(path, init = {}) {
  return fetch(new URL(path, origin), { ...init, redirect: "manual", signal: AbortSignal.timeout(15000) });
}

await check("landing_page", async () => {
  const response = await fetchNoFollow("/");
  expect(response.status === 200, `expected 200, got ${response.status}`);
  return { status: response.status };
});

await check("security_headers", async () => {
  const response = await fetchNoFollow("/");
  const required = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
  for (const [name, expected] of Object.entries(required)) {
    expect(response.headers.get(name) === expected, `${name} is missing or incorrect`);
  }
  expect(Boolean(response.headers.get("content-security-policy")), "content-security-policy is missing");
  if (new URL(origin).protocol === "https:") {
    expect(Boolean(response.headers.get("strict-transport-security")), "strict-transport-security is missing on HTTPS deployment");
  }
  return { csp: true, hsts: new URL(origin).protocol === "https:" };
});

await check("health", async () => {
  const response = await fetchNoFollow("/api/health");
  const body = await response.json().catch(() => ({}));
  expect(response.status === 200, `expected 200, got ${response.status}`);
  expect(body?.ok === true, "health endpoint did not report ok=true");
  return { status: response.status };
});

await check("readiness_environment_database_migrations", async () => {
  const response = await fetchNoFollow("/api/readiness");
  const body = await response.json().catch(() => ({}));
  expect(response.status === 200, `expected 200, got ${response.status}; response=${JSON.stringify(body)}`);
  expect(body?.ok === true, "readiness did not report ok=true");
  expect(body?.environment === true, "readiness environment check failed");
  expect(body?.database === true, "readiness database check failed");
  expect(body?.migrations === true, "readiness migration/schema check failed; run pnpm db:migrate against production DATABASE_URL");
  return { environment: true, database: true, migrations: true };
});

await check("google_oauth_start", async () => {
  const response = await fetchNoFollow("/api/auth/google/start");
  expect([302, 303, 307, 308].includes(response.status), `expected redirect, got ${response.status}`);
  const location = response.headers.get("location");
  expect(Boolean(location), "OAuth start redirect did not include Location");
  const target = new URL(location, origin);
  expect(target.hostname === "accounts.google.com", `OAuth is not configured; redirected to ${target.href}`);
  expect(target.searchParams.get("code_challenge_method") === "S256", "OAuth PKCE S256 challenge is missing");

  const scopes = new Set((target.searchParams.get("scope") || "").split(/\s+/).filter(Boolean));
  const managedDriveScope = "https://www.googleapis.com/auth/drive.file";
  const appDataScope = "https://www.googleapis.com/auth/drive.appdata";
  const fullDriveScope = "https://www.googleapis.com/auth/drive";
  expect(scopes.has(managedDriveScope), "default OAuth flow is missing drive.file managed scope");
  expect(scopes.has(appDataScope), "default OAuth flow is missing drive.appdata recovery scope");
  expect(!scopes.has(fullDriveScope), "default OAuth flow unexpectedly requests full Drive scope");

  const expectedCallback = new URL("/api/auth/google/callback", origin).toString();
  expect(target.searchParams.get("redirect_uri") === expectedCallback, `OAuth redirect_uri does not match deployed origin; expected ${expectedCallback}`);
  return { provider: target.hostname, pkce: true, managedScope: true, appDataScope: true, redirectUri: expectedCallback };
});

await check("maintenance_requires_secret", async () => {
  const response = await fetchNoFollow("/api/maintenance");
  expect(response.status === 401, `expected unauthenticated maintenance to return 401, got ${response.status}`);
  return { status: response.status };
});

await check("cross_origin_mutation_guard", async () => {
  const response = await fetchNoFollow("/api/accounts", {
    method: "POST",
    headers: { origin: "https://foreign.invalid", "content-type": "application/json" },
    body: "{}",
  });
  expect(response.status === 403, `expected foreign-origin mutation to return 403, got ${response.status}`);
  return { status: response.status };
});

const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  origin,
  passed: results.filter((item) => item.status === "pass").length,
  failed: results.filter((item) => item.status === "fail").length,
  results,
};

if (reportPath) {
  fs.writeFileSync(reportPath, `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 });
  console.log(`Report written to ${reportPath}`);
}

console.log(`\nMeshly production preflight: ${summary.passed} passed, ${summary.failed} failed`);
if (summary.failed > 0) process.exit(1);

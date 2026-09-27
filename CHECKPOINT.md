# Meshly — canonical continuation checkpoint

> **READ THIS BEFORE CONTINUING.** Also read `AGENTS.md`, `HANDOFF.md`, `NEXT_ACTION.md`, `.meshly/project-state.json`, `.meshly/current-task.json`, `.meshly/resume-state.json`, and the newest file under `docs/checkpoints/`. Newer repository commits and live deployment state always win over this document.

**Checkpoint date:** 2026-09-28  
**Repository:** `cassielxyz/Meshly`  
**Branch:** `main`  
**Current main commit:** `a74596ae8a12c4c9025914112807162e9af17cce`  
**Latest verified runtime commit:** `9018491a83d9663dc09b32c9889c3133cac15e01`  
**Latest verified implementation CI run:** `36344842001`  
**Verified production deployment:** `dpl_4yceJJbueyJS978P2sviWdPkQ2By`  
**Latest verified production milestone record:** `docs/checkpoints/2026-09-28-dropbox-transfer-foundation-deployed.md`

## Current state

Meshly production at `https://meshly.cassielae.me` is still serving the last verified runtime `9018491a83d9663dc09b32c9889c3133cac15e01`. Its live readiness is HTTP 200 with environment, PostgreSQL connectivity, migrations, managed encryption schema v1 and provider-object schema v2 verified.

PR #14 was exact-head CI verified and squash-merged into main as `a74596ae8a12c4c9025914112807162e9af17cce`. That merged code contains Google quota-category correction/migration `0008` plus the activation-gated encrypted TeraBox small-file foundation.

**PR #14 is not production-deployed yet.** Vercel reported `Deployment rate limited — retry in 24 hours` for main `a74596ae8a12c4c9025914112807162e9af17cce`. Therefore migration `0008` and `googleQuotaSchema: "v2"` must not be called live or production-verified yet.

Google supports narrow managed mode plus a targeted **Show existing files** upgrade using read-only Drive access. A user-completed consent/indexing test is still required before claiming that pre-existing Drive files are verified in production.

Do **not** call Meshly `production_verified` yet.

## Completed in code

- Responsive logical filesystem and core file/account flows.
- Managed Google OAuth plus targeted optional Full Drive indexing (`drive.readonly` + `drive.file` + `drive.appdata`).
- Per-account Google quota refresh and live refresh controls.
- Google quota model/reporting that separately represents total Google usage, Drive usage and Drive-trash usage; production migration `0008` still awaits a successful deployment.
- Google whole-file-only Auto/manual placement.
- Mandatory managed encryption v1 with opaque remote objects.
- Provider-account persistence and official Dropbox/TeraBox auth/quota/browse foundations.
- `provider_objects` persistence via migration `0007_provider_objects.sql`.
- Activation-gated encrypted Dropbox managed uploads using Meshly encryption v1.
- Dropbox upload-session offset reconciliation, encrypted ranged download/decrypt, remote verification before ready, permanent-delete/disconnect guards, provider integrity checks and recovery-manifest v3 integration.
- Activation-gated TeraBox encrypted small-file planning/upload/verification/download/decrypt/abort/delete with retry-safe precreate handling and remote size/available-MD5 checks.
- User-facing provider upload controls that stay hidden unless the corresponding managed-upload safety gate is enabled.
- TeraBox serverless path intentionally limited to <= 3 MiB ciphertext; large-file transfer still requires a dedicated worker.
- Other Clouds UI backed by actual provider state instead of static placeholders.
- MEGA explicitly held behind an official SDK-backed worker.
- Public multicloud/encryption landing, legal pages, strict production environment validation and production-only checksum-verified migrations.
- Durable canonical + active-work checkpoint layers.

## Verification already completed

PR #14 head `528ed99e9f519005e6ed2b3e25c907d921edd417` passed GitHub Actions run `36344842001`: frozen install, checkpoint validation, production dependency audit, lint, strict TypeScript, tests and production build. No unresolved review threads were present before merge.

Main commit `9018491a83d9663dc09b32c9889c3133cac15e01` remains the last verified production runtime and is deployed as `dpl_4yceJJbueyJS978P2sviWdPkQ2By`, state **READY**.

Live production `/api/readiness` for that verified runtime confirms:

- HTTP 200;
- `environment: true`;
- `database: true`;
- `migrations: true`;
- `encryptionSchema: "v1"`;
- `providerSchema: "v2"`.

Earlier production verification also confirmed Google OAuth start parameters, exact callback, offline access, PKCE S256, security headers and migrations through the provider-object foundation.

## Current deployment blocker

GitHub/Vercel status for current main `a74596ae8a12c4c9025914112807162e9af17cce` is failure with description: `Deployment rate limited — retry in 24 hours.` This is a hosting-account build-rate limit, not a repository CI failure. Do not bypass it with unsupported deployment tricks and do not treat READY preview builds as production verification.

## Encryption trust model

Do **not** call the current design zero-knowledge or provider-only E2EE. Meshly's authenticated planning/download paths participate in file-key handling. Providers receive ciphertext for new managed files, but the Meshly backend is trusted by the current design.

## NOT yet proven with real production credentials

- successful production deployment of current main and migration `0008`;
- live readiness `googleQuotaSchema: "v2"`;
- user-completed Google existing-file consent + successful initial index;
- exact browser-visible Google account/Drive quota comparison against the provider;
- real encrypted Google Auto-account and explicitly selected-account upload/download SHA-256 round trips;
- provider-side inspection of a real Google managed ciphertext object;
- real Dropbox OAuth/quota/browse plus encrypted managed upload/download SHA-256 equality;
- Dropbox interrupted/retried transfer, integrity, permanent delete and recovery restore rehearsal;
- TeraBox auth/quota/browse plus encrypted managed transfer live verification;
- large-file TeraBox transfer worker;
- MEGA official-SDK worker integration;
- final sharing, cron and desktop/mobile authenticated smoke tests.

## Next actions — do these in order

1. After the Vercel build-rate window clears, retry/redeploy current main `a74596ae8a12c4c9025914112807162e9af17cce`; keep Dropbox/TeraBox managed-upload gates off.
2. Verify the production deployment is READY and `/api/readiness` returns HTTP 200 with `googleQuotaSchema: "v2"`, `providerSchema: "v2"`, migrations true and encryption schema v1.
3. In the authenticated production browser, run **Show existing files**, verify the pre-existing Google Drive index, and compare refreshed per-account total/Drive/trash values with Google.
4. Run encrypted Google Auto + explicit-account upload/download SHA-256 tests and inspect the opaque provider object.
5. Configure Dropbox/TeraBox application credentials only outside chat/repository and run provider-specific live transfer verification before enabling either managed-upload gate.
6. Implement a dedicated large-file TeraBox transfer worker and an official-SDK-backed MEGA worker before presenting those capabilities as active.
7. Advance to `production_verified` only after all required live tests genuinely pass.

## Invariants

- Every new Meshly-managed file uses encryption v1.
- Google managed files stay whole in one Google account; no cross-account Google sharding.
- Pre-existing Google files are indexed only after explicit broader read consent.
- No logical managed file becomes `ready` before its remote encrypted object verifies.
- Provider connection/browsing does not equal encrypted managed-upload support.
- Provider upload gates remain off until provider-specific live verification passes.
- Production migrations are transactional, checksum-verified and production-only during Vercel builds.
- Preview/local/CI builds do not mutate the production database.
- Never place production secrets, provider tokens, OAuth codes, cookies or plaintext file keys in repository/checkpoint files/issues/screenshots/chat.
- Current encryption is backend-trusted, not zero-knowledge.
- Provider limits, supported APIs/SDKs and terms must be respected.
- Repository/deployment state newer than this checkpoint wins.

# Meshly — canonical continuation checkpoint

> **READ THIS BEFORE CONTINUING THE PROJECT.** This file is the short source of truth for what is complete, what is not yet proven, and what should happen next. Also read `AGENTS.md` and `.meshly/project-state.json`.

**Checkpoint date:** 2026-09-26  
**Repository:** `cassielxyz/Meshly`  
**Branch:** `main`  
**Checkpoint generated after verified runtime/CI commit:** `731473cb627d85c370f337285e98a33b1cccbef7`  
**Latest milestone record:** `docs/checkpoints/2026-09-26-reproducible-security-gate-complete.md`

## Project goal

Meshly presents multiple connected Google Drive accounts as one Drive-like logical workspace. It pools real account quota, chooses storage destinations automatically, splits a file across accounts only when necessary, reconstructs multipart files in exact byte order, and hides physical-account complexity from normal users.

## Completed in code

### Product / UI

- Meshly product identity and Google-productivity-color-inspired original logo/branding.
- Light-first responsive Drive-style workspace with dark theme tokens.
- Landing, login, onboarding, My Drive/folder routes, recent, starred, shared, trash, storage, accounts, transfers, activity, integrity, recovery, notifications, diagnostics, help, privacy, profile, settings, public-share, error and 404 states.
- Live logical item browser with breadcrumbs/search and list/grid-oriented file management UI.
- New folder, file upload, folder upload, rename/move/copy/star/trash/restore/permanent-delete paths.

### Storage engine

- Unified per-account quota/storage pool.
- Whole-file-first placement with reserve-aware capacity planning.
- Cross-account deterministic byte-range splitting when a file cannot safely fit one account.
- Incremental SHA-256 hashing for large browser uploads.
- Google Drive resumable upload session creation and direct browser-to-Google part upload.
- Upload commit verification before a logical file is promoted to ready.
- Multipart reconstruction in logical byte order with HTTP Range support.
- Abort/cleanup path for incomplete uploads.

### Google accounts / indexing

- Multi-account Google OAuth foundation with PKCE/state protections.
- Managed mode using narrower Drive access for Meshly-managed files.
- Optional Full Drive mode and existing-Drive indexing/change synchronization code.
- Per-account health/quota refresh and upload pause/disconnect controls.
- Protection against disconnecting an account while managed chunks depend on it.

### Sharing / integrity / recovery

- Public share links with hashed tokens.
- Optional password protection, expiration, download caps and revocation.
- Short-lived signed share grants and persisted auth-attempt rate limiting.
- Integrity scan paths for physical chunks/degraded files.
- Signed disaster-recovery manifests stored via Drive app data.
- Logical-index restore path from the newest valid recovery manifest.

### Operations / security

- Encrypted Google refresh tokens using AES-256-GCM.
- HttpOnly/SameSite session handling.
- CSP/HSTS/security headers and same-origin protection for unsafe `/api/*` mutations.
- Request IDs for tracing.
- `/api/health` and production `/api/readiness` checks.
- `/api/readiness` verifies required migrated tables/columns for migrations 0001-0004, not only DB connectivity.
- Scheduled `/api/maintenance` endpoint protected by `CRON_SECRET` for quota refresh, Full Drive synchronization and recovery maintenance.
- PostgreSQL/Drizzle schema and migrations.
- Vercel cron configuration.
- `pnpm production:preflight` automated deployed-origin verification harness.
- Preflight verifies security headers, health, environment/database/migrations, Google OAuth redirect + PKCE S256, default Managed scopes (`drive.file` + `drive.appdata`), absence of accidental broad Drive scope, exact callback URL, cron auth protection and cross-origin mutation rejection.
- `PRODUCTION_TESTING.md` credential-dependent test matrix and local evidence template.
- `pnpm release:check` evidence gate for final production release readiness.
- Committed `pnpm-lock.yaml` with frozen CI installs for deterministic dependency resolution.
- Production dependency audit is part of both CI and `pnpm verify`.
- `drizzle-orm` upgraded to `0.45.3` after the audit caught high-severity advisory `GHSA-gpj5-g38j-94v9` affecting versions below `0.45.2`.
- GitHub Actions upgraded to current non-Node-20 releases: `actions/checkout@v7.0.1`, `pnpm/action-setup@v6.1.0`, and `actions/setup-node@v7.0.0`.
- Dependabot monitors npm and GitHub Actions weekly.
- CI for frozen install, checkpoint validation, production audit, lint, strict TypeScript, tests and optimized Next production build.
- Production deployment guide in `DEPLOYMENT.md`.
- Durable continuation/checkpoint protocol in `AGENTS.md`, `CHECKPOINT.md`, `.meshly/project-state.json`, `CONTINUE.md`, and `docs/checkpoints/`.

## Verification already completed

The latest runtime/CI state at commit `731473cb627d85c370f337285e98a33b1cccbef7` passed GitHub Actions run `36186865942` with:

- modern GitHub Actions setup: **PASS**
- frozen `pnpm-lock.yaml` installation: **PASS**
- checkpoint validation: **PASS**
- production dependency security audit: **PASS**
- ESLint: **PASS**
- strict TypeScript typecheck: **PASS**
- Vitest unit tests: **PASS**
- optimized Next.js production build: **PASS**

The earlier production audit failure was intentionally resolved by upgrading `drizzle-orm` from the vulnerable 0.44.x line to patched stable `0.45.3`; the audit is green after the upgrade.

Do not rerun or rebuild completed product features merely because a chat was lost. Newer repository commits always take precedence over this checkpoint.

## NOT yet proven with real production credentials

Do not confuse these with missing code. The code and verification tooling exist, but these still require a real deployment/integration test:

- Production PostgreSQL connection and all migrations against the chosen hosted DB.
- Real deployed `pnpm production:preflight` result with environment/database/migrations all ready.
- Real Google OAuth login/callback with production client ID/secret/domain.
- Connecting two or more real Google accounts and confirming real pooled quotas.
- Real small-file upload/download round trip with matching whole-file SHA-256.
- Real forced cross-account multipart upload/reconstruction with matching whole-file SHA-256.
- Real interrupted/resumed upload behavior against Google.
- Full Drive mode indexing/change sync using an OAuth client approved/eligible for the broader scope, only if Full mode will be enabled.
- Integrity scan against real stored chunks.
- Recovery snapshot written to Google app data and restore rehearsal.
- Public share password/expiry/download-limit/revocation flow against a deployed origin.
- Vercel scheduled maintenance invocation using the real `CRON_SECRET`.
- Browser/device UX smoke test on deployed desktop and mobile layouts.

## Current phase

**Phase: credentials + deployment + real integration verification.**

The product build, checkpoint system, production preflight harness, reproducible dependency gate, security audit gate and release evidence gate are complete. Do not restart them. First configure and test the existing production code. Only patch code when a real test, CI, security review, dependency advisory, or UX smoke test reveals an issue.

## Next actions — do these in order

1. Provision a production PostgreSQL database with TLS.
2. Add all environment variables from `.env.example`:
   - `NEXT_PUBLIC_APP_URL`
   - `DATABASE_URL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`
   - `SESSION_SECRET`
   - `TOKEN_ENCRYPTION_KEY`
   - `RECOVERY_SECRET`
   - `SHARE_GRANT_SECRET`
   - `CRON_SECRET`
3. Run `pnpm db:migrate` against the production database.
4. Deploy `main` to Vercel/Node 22+.
5. Run `pnpm production:preflight https://YOUR_DOMAIN --report=.meshly/preflight-report.json` and require every automated check to pass.
6. Complete every required real-user test in `PRODUCTION_TESTING.md` and record non-secret local evidence in `.meshly/integration-results.json` using `docs/integration-results.template.json`.
7. Specifically force one test file to span at least two Google accounts, download it, and compare its whole-file SHA-256 with the original.
8. Run Integrity and Recovery tests with real Drive storage.
9. Verify share-link controls and scheduled maintenance.
10. Run desktop and mobile deployed smoke tests.
11. Run `pnpm release:check` and then `pnpm verify`.
12. Fix only issues found during those tests; rerun the relevant test plus the full verification gate after every fix.
13. When all credential-dependent required tests pass, update this checkpoint to **production verified** and create a release/tag.

## External constraint

Full Drive mode uses broader Google Drive access. Treat Managed mode as the public/default mode unless the deployment has completed Google's applicable OAuth verification/security-review requirements for broader scopes.

## How the next ChatGPT session should continue

A new session should be told only:

> Open `cassielxyz/Meshly`. Read `AGENTS.md`, `CHECKPOINT.md`, `.meshly/project-state.json`, and the newest checkpoint under `docs/checkpoints/`. Inspect commits/CI after the recorded checkpoint, reconcile any newer changes, and continue only from the unfinished `Next actions`. Do not redo completed work.

Then the agent should inspect the repo rather than asking the user to reconstruct old chat history.

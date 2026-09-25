# Meshly — canonical continuation checkpoint

> **READ THIS BEFORE CONTINUING THE PROJECT.** This file is the short source of truth for what is complete, what is not yet proven, and what should happen next. Also read `AGENTS.md` and `.meshly/project-state.json`.

**Checkpoint date:** 2026-09-26  
**Repository:** `cassielxyz/Meshly`  
**Branch:** `main`  
**Checkpoint generated after head:** `9bb2c8e71ba816bee12fef2037034a393b8199d5`  
**Last runtime-hardening commit verified green:** `2866cfaa8fb9c16d0c28a63a97a6e52eb1fd460a`  
**Latest production documentation baseline before checkpoint system:** `7bec01087f9deacd678262e226bb433a68a66e93`

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
- Scheduled `/api/maintenance` endpoint protected by `CRON_SECRET` for quota refresh, Full Drive synchronization and recovery maintenance.
- PostgreSQL/Drizzle schema and migrations.
- Vercel cron configuration.
- CI for lint, strict TypeScript, tests and optimized Next production build.
- Production deployment guide in `DEPLOYMENT.md`.

## Verification already completed

The runtime-hardening state at commit `2866cfaa8fb9c16d0c28a63a97a6e52eb1fd460a` passed GitHub Actions with:

- dependency installation: **PASS**
- ESLint: **PASS**
- strict TypeScript typecheck: **PASS**
- Vitest unit tests: **PASS**
- optimized Next.js production build: **PASS**

Subsequent commit `7bec010...` was documentation-only. The new checkpoint-system commits must also pass CI before this checkpoint is advanced.

## NOT yet proven with real production credentials

Do not confuse these with missing code. The code paths exist, but these still require a real integration test:

- Production PostgreSQL connection and all migrations against the chosen hosted DB.
- Real Google OAuth login/callback with production client ID/secret/domain.
- Connecting two or more real Google accounts and confirming real pooled quotas.
- Real small-file upload/download round trip.
- Real forced cross-account multipart upload/reconstruction and whole-file hash match.
- Real interrupted/resumed upload behavior against Google.
- Full Drive mode indexing/change sync using an OAuth client approved for the broader scope.
- Integrity scan against real stored chunks.
- Recovery snapshot written to Google app data and restore rehearsal.
- Public share password/expiry/download-limit flow against a deployed origin.
- Vercel scheduled maintenance invocation using the real `CRON_SECRET`.
- Browser/device UX smoke test on deployed desktop and mobile layouts.

## Current phase

**Phase: credentials + deployment + real integration verification.**

Do not restart the product build. Do not replace implemented APIs with demos. First configure and test the existing production code. Only patch code when a real test, CI, security review, or UX smoke test reveals an issue.

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
5. Verify `GET /api/health` and require `GET /api/readiness` to return HTTP 200.
6. Complete the real-user integration checklist in `DEPLOYMENT.md`.
7. Specifically force one test file to span at least two Google accounts, download it, and compare its whole-file SHA-256 with the original.
8. Run Integrity and Recovery tests with real Drive storage.
9. Verify share-link controls and scheduled maintenance.
10. Fix only issues found during those tests; rerun the full verification gate after every fix.
11. When all credential-dependent tests pass, update this checkpoint to **production verified** and create a release/tag.

## External constraint

Full Drive mode uses broader Google Drive access. Treat Managed mode as the public/default mode unless the deployment has completed Google's applicable OAuth verification/security-review requirements for broader scopes.

## How the next ChatGPT session should continue

A new session should be told only:

> Open `cassielxyz/Meshly`. Read `AGENTS.md`, `CHECKPOINT.md`, `.meshly/project-state.json`, and the newest checkpoint under `docs/checkpoints/`. Inspect commits/CI after the recorded checkpoint, reconcile any newer changes, and continue only from the unfinished `Next actions`. Do not redo completed work.

Then the agent should inspect the repo rather than asking the user to reconstruct old chat history.

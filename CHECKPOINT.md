# Meshly — canonical continuation checkpoint

> **READ THIS BEFORE CONTINUING THE PROJECT.** Also read `AGENTS.md`, `.meshly/project-state.json`, and the newest file in `docs/checkpoints/` before changing code.

**Checkpoint date:** 2026-09-26  
**Repository:** `cassielxyz/Meshly`  
**Branch:** `main`  
**Latest verified runtime/UI commit:** `174cc527b4eda3949860789210e6d39dd8229509`  
**Latest milestone record:** `docs/checkpoints/2026-09-26-interactive-demo-motion-polish-complete.md`

## Current project state

Meshly is production-code complete and is now in the **credentials + deployment + real integration verification** phase.

Do **not** restart the product build, storage engine, security hardening, production preflight tooling, dependency hardening, checkpoint system, or interactive demo/landing-motion redesign. Newer repository commits always take precedence over this checkpoint.

## Completed in code

### Product / UI

- Original Meshly branding with Google-productivity-inspired color language.
- Responsive light-first Drive-style workspace with dark theme tokens.
- Landing, login, onboarding, My Drive/folders, search, recent, starred, shared, trash, storage, accounts, transfers, activity, integrity, recovery, notifications, diagnostics, help, privacy, profile, settings, public-share, error and 404 states.
- Live logical item browser with breadcrumbs/search and list/grid workflows.
- Folder/file creation and upload, rename, move, copy, star, trash, restore and permanent delete.
- Public `/demo` route using simulated data only; no credentials required.
- Demo walkthrough covers connect → pool capacity → placement planning → cross-account split → resumable upload → verified reconstruction.
- Demo includes auto-play, pause/play, direct step selection, back/next controls and onboarding CTA.
- Landing demo links now point to `/demo` instead of the authenticated `/drive` route.
- Landing visual cleanup removed emoji/generic mock artifacts and replaced them with consistent product icons/surfaces.
- Landing motion includes scroll progress, staged reveals, restrained hover motion and a pinned scroll-driven storage-placement story.
- Motion is transform/opacity-first with `prefers-reduced-motion` fallbacks.

### Storage engine

- Unified per-account quota/storage pool.
- Whole-file-first reserve-aware placement.
- Deterministic cross-account byte-range splitting when required.
- Incremental SHA-256 hashing for large browser uploads.
- Google Drive resumable upload session creation and direct browser-to-Google part uploads.
- Upload commit verification before logical-file promotion.
- Multipart reconstruction with HTTP Range support.
- Abort/cleanup path for incomplete uploads.

### Google accounts / indexing

- Multi-account OAuth with PKCE/state protections.
- Managed mode using narrower Drive access for Meshly-managed files.
- Optional Full Drive mode and existing-Drive indexing/change-sync code.
- Per-account health/quota refresh and pause/disconnect controls.
- Dependency protection before account disconnect.

### Sharing / integrity / recovery

- Public share links with hashed tokens.
- Password protection, expiration, download caps and revocation.
- Short-lived signed share grants and persisted auth-attempt rate limiting.
- Integrity scanning/degraded-file paths.
- Signed recovery manifests in Drive app data.
- Restore path from the newest valid recovery manifest.

### Operations / security

- AES-256-GCM encrypted Google refresh tokens.
- HttpOnly/SameSite sessions.
- CSP/HSTS/security headers and same-origin unsafe mutation protection.
- Request IDs.
- `/api/health` and migration-aware `/api/readiness`.
- Scheduled `/api/maintenance` protected by `CRON_SECRET`.
- PostgreSQL/Drizzle schema and migrations.
- Vercel cron configuration.
- `pnpm production:preflight` deployment verification harness.
- Preflight checks security headers, health, environment/database/migrations, OAuth redirect + PKCE, Managed scopes, exact callback URL, cron protection and cross-origin mutation rejection.
- `PRODUCTION_TESTING.md` real integration matrix and evidence template.
- `pnpm release:check` final evidence gate.
- Committed `pnpm-lock.yaml` and frozen dependency installs.
- Production dependency audit runs in CI and `pnpm verify`.
- `drizzle-orm` upgraded to patched `0.45.3` after CI caught high-severity advisory `GHSA-gpj5-g38j-94v9` affecting versions below `0.45.2`.
- Current GitHub Actions runtimes: `actions/checkout@v7.0.1`, `pnpm/action-setup@v6.1.0`, `actions/setup-node@v7.0.0`.
- Dependabot monitors npm and GitHub Actions.
- Durable AI continuation system exists in `AGENTS.md`, `CHECKPOINT.md`, `.meshly/project-state.json`, `CONTINUE.md`, and `docs/checkpoints/`.

## Latest verification

GitHub Actions run `36189159898` for commit `174cc527b4eda3949860789210e6d39dd8229509` passed:

- frozen dependency install: **PASS**
- checkpoint validation: **PASS**
- production dependency security audit: **PASS**
- ESLint: **PASS**
- strict TypeScript: **PASS**
- Vitest: **PASS**
- optimized Next.js production build: **PASS**

An earlier UI run correctly caught two conditional `useTransform` hook calls in the new scroll choreography. Those were fixed before the verified run above.

## Not yet proven with real production credentials

These are integration/deployment tasks, not missing product code:

- Hosted TLS PostgreSQL and production migrations.
- Deployed `pnpm production:preflight` with all readiness checks green.
- Real Google OAuth login/callback on the production domain.
- Two or more real Google accounts and pooled real quota.
- Small-file upload/download SHA-256 round trip.
- Forced cross-account multipart upload/reconstruction SHA-256 round trip.
- Interrupted/resumed upload against Google.
- Full Drive indexing/change sync if broader scope will be enabled.
- Real chunk integrity scan.
- Recovery snapshot and restore rehearsal.
- Deployed share password/expiry/download-limit/revocation flow.
- Vercel cron with real `CRON_SECRET`.
- Desktop/mobile deployed UX smoke test, including `/`, `/demo`, reduced-motion mode and scroll smoothness.

## Next actions — do these in order

1. Provision production PostgreSQL with TLS.
2. Add all environment variables from `.env.example`.
3. Run `pnpm db:migrate` against production.
4. Deploy `main` to Vercel/Node 22+.
5. Run `pnpm production:preflight https://YOUR_DOMAIN --report=.meshly/preflight-report.json` and require all checks to pass.
6. Run the required tests in `PRODUCTION_TESTING.md` and record non-secret evidence in `.meshly/integration-results.json`.
7. Force one test file to span at least two Google accounts, download it and compare whole-file SHA-256.
8. Run Integrity and Recovery rehearsals.
9. Verify public sharing and scheduled maintenance.
10. Smoke-test desktop and mobile, including landing/demo animations and reduced-motion behavior.
11. Run `pnpm release:check` and `pnpm verify`.
12. Fix only failures found by real testing, rerunning the relevant test and full gate after each fix.
13. When all required credential-dependent tests pass, update this checkpoint to **production verified** and create the release/tag.

## External constraint

Full Drive mode uses broader Google Drive access. Keep Managed mode as the public/default mode unless the deployment has completed Google’s applicable OAuth verification/security-review requirements for broader scopes.

## Continuation prompt for a new AI session

> Open `cassielxyz/Meshly`. Read `AGENTS.md`, `CHECKPOINT.md`, `.meshly/project-state.json`, and the newest checkpoint under `docs/checkpoints/`. Inspect commits and CI after the recorded checkpoint, reconcile newer changes, and continue only from the unfinished `Next actions`. Do not redo completed work.

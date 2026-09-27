# Meshly active handoff

> Read this after `AGENTS.md`. It records work that may be newer than the last verified milestone in `CHECKPOINT.md`.

**Updated:** 2026-09-27  
**Repository:** `cassielxyz/Meshly`  
**Active branch:** `work/production-live-verification`  
**Active PR:** `#7`  
**Current main:** `eb755a886162194b08f40e275cc96b2d6d90c418`  
**Last verified code milestone:** production preflight hardening (`bb079892b05cec46c1ac95dcb22fa4c6e01e8ab5`, CI `36269498896`)

## Active task

Continue real production verification from the deployed `main` build without storing credentials in Git or chat.

## Live production probe already completed

Verified on `https://meshly.cassielae.me`:

- `/`, `/privacy`, `/terms` → HTTP 200.
- `/api/health` → HTTP 200 with OAuth/database configured.
- managed Google OAuth start uses identity + `drive.file` + `drive.appdata`, offline access, PKCE S256 and the exact production callback.
- production security headers are present.
- `TOKEN_ENCRYPTION_KEY` is accepted by strict environment validation.
- `/api/readiness` currently proves `environment: true` and `database: true` but `migrations: false`.
- runtime logs show the concrete schema failure is `relation "users" does not exist`.

## Autonomous migration fix implemented on this branch

To avoid asking the user to copy `DATABASE_URL` into Codespaces or chat, PR #7 now adds a Vercel-only production build wrapper:

- `scripts/vercel-build.mjs` runs the existing checksum-verified transactional `scripts/migrate.mjs` **only when `VERCEL_ENV=production`**;
- preview/local/CI builds skip database migration;
- production build fails closed if `DATABASE_URL` is unavailable;
- after migrations, the wrapper runs the normal Next.js production build;
- `package.json` exposes this as the Vercel `vercel-build` script.

The application migration runner remains the single source of truth; no production credential is copied into Git or chat.

GitHub Actions run `36284399176` passed install, checkpoint validation, production dependency audit, lint, strict TypeScript, tests and the normal production build for the migration-wrapper implementation before this checkpoint update.

## Exact next action

1. Verify the checkpoint-only CI for the latest PR #7 head.
2. Merge PR #7 when green.
3. Let the main production Vercel deployment run `vercel-build`; it should apply migrations `0001` through `0005` using the already-configured production `DATABASE_URL`, then build/deploy.
4. Inspect deployment logs to confirm migrations were applied/skipped correctly without secret output.
5. Re-run `https://meshly.cassielae.me/api/readiness` and require HTTP 200 with `environment`, `database`, and `migrations` all true.
6. Then continue real Google sign-in and encrypted Auto/manual upload/download SHA-256 verification.

## Invariants

- Never request or store production secrets in chat or repository files.
- Production migrations must be idempotent/checksum-verified and run before the production app build becomes deployable.
- Preview/local/CI builds must not mutate the production database.
- New Meshly-managed files remain encrypted before provider storage.
- Google managed files remain whole-file-only in one Google account.
- Current encryption is backend-trusted, not zero-knowledge.
- Purpose-specific production secrets remain independent.
- Repository/deployment state newer than this handoff wins.

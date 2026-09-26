# 2026-09-27 — Production preflight hardening

## Milestone

Meshly’s code-side production configuration checks and automated preflight now fail closed on several deployment mistakes before real provider testing begins.

## Implemented

- `TOKEN_ENCRYPTION_KEY` must decode from canonical Base64 to exactly 32 bytes.
- Production origin must use HTTPS except for localhost development.
- `GOOGLE_REDIRECT_URI` must exactly match `NEXT_PUBLIC_APP_URL + /api/auth/google/callback`.
- Session, encryption, recovery, share-grant and cron secrets must be purpose-specific and not reused.
- Environment validation tests cover the valid production shape and hardened failure cases.
- Production preflight additionally verifies:
  - `/privacy` and `/terms` return successfully;
  - readiness reports encryption schema v1;
  - OpenID identity scopes are present;
  - managed `drive.file` and `drive.appdata` scopes are present;
  - default flow does not unexpectedly request full Drive scope;
  - offline access is requested;
  - PKCE uses S256;
  - redirect URI exactly matches the deployed callback.
- Deployment guidance documents the stricter validator and preflight behavior.

## Verification

Runtime/task commit: `bb079892b05cec46c1ac95dcb22fa4c6e01e8ab5`  
GitHub Actions run: `36269498896`

Passed:

- frozen pnpm install;
- checkpoint validation;
- production dependency security audit;
- ESLint;
- strict TypeScript;
- Vitest;
- optimized Next.js production build.

This is code/CI verification only. Real production database, OAuth credentials, deployed preflight and provider round trips remain external integration work.

## Next

1. Merge PR #6 after checkpoint-only CI is green.
2. Configure production PostgreSQL and run migrations through `0005`.
3. Configure production OAuth/application secrets in external secret storage only.
4. Deploy and run automated preflight.
5. Complete all required encrypted Google Auto/manual round-trip, ciphertext inspection, resume, integrity, recovery, sharing, cron and smoke tests.
6. Mark `production_verified` only after those live tests genuinely pass.

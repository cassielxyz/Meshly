# 2026-09-27 — Production readiness green

## Milestone

Meshly’s unauthenticated production readiness path is now green on `https://meshly.cassielae.me`: hardened environment validation, PostgreSQL connectivity, schema migrations through `0005`, encryption schema v1, and the managed Google OAuth start configuration are all verified live.

## What was completed

- Added a Vercel production-only migration-before-build wrapper.
- Preview/local/CI builds remain non-mutating for the production database.
- Production migration client now matches runtime PostgreSQL TLS behavior and disables prepared statements.
- Diagnosed the failing initial migration without copying `DATABASE_URL` or other secrets:
  - preview-only diagnostic endpoint;
  - transaction intentionally rolled back;
  - schema CREATE privilege confirmed;
  - `_meshly_migrations` existed but migration 0001 was not recorded;
  - exact dry-run failed with PostgreSQL `42601`, routine `scanner_yyerror`, at unquoted `offset`;
  - no diagnostic table persisted.
- Fixed `0001_meshly.sql` by quoting the physical chunk column as `"offset"`, matching the existing Drizzle column.
- Production Vercel deployment then completed successfully and became the custom-domain deployment.

## Verification

Main runtime commit: `8c748046577739f679eebc9863139c6d983cadda`  
GitHub Actions run: `36285454881` — PASS  
Vercel production deployment: `dpl_Hf3g7pzhCto1LspvNFQU9ppCH7zZ` — READY

Live checks after deployment:

- `/api/health` → HTTP 200, OAuth configured, database configured.
- `/api/readiness` → HTTP 200 with:
  - `environment: true`;
  - `database: true`;
  - `migrations: true`;
  - `encryptionSchema: "v1"`.
- managed Google OAuth start → correct identity scopes, `drive.file`, `drive.appdata`, offline access, PKCE S256 and exact production callback.
- no grouped runtime errors in the inspected five-minute window after successful deployment.

## Important boundary

This milestone does **not** mean Meshly is fully `production_verified`. The following still require a real authenticated user session and real provider data:

- Google OAuth callback/session success;
- encrypted managed upload/download SHA-256 equality;
- opaque remote ciphertext/name inspection;
- Auto and explicit Google-account placement round trips;
- resume, integrity, recovery, sharing, cron and authenticated desktop/mobile smoke tests.

## Next

The user must complete normal Google sign-in at `https://meshly.cassielae.me`. No password, OAuth code, cookie or token should be shared in chat. Continue from callback success or the exact visible error, then run the required encrypted provider round trips.

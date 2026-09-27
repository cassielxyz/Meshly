# Meshly active handoff

> Read this after `AGENTS.md`. It records work that may be newer than the canonical milestone in `CHECKPOINT.md`.

**Updated:** 2026-09-27  
**Repository:** `cassielxyz/Meshly`  
**Active branch:** `main`  
**Active PR:** none  
**Current main:** `8c748046577739f679eebc9863139c6d983cadda`  
**Verified CI:** `36285454881`  
**Verified production deployment:** `dpl_Hf3g7pzhCto1LspvNFQU9ppCH7zZ`

## Active task

Continue authenticated production verification without storing credentials, OAuth codes, provider tokens or plaintext file keys in Git or chat.

## Production state already verified

Live on `https://meshly.cassielae.me`:

- deployment is READY;
- `/`, `/privacy`, `/terms` are deployed;
- `/api/health` is HTTP 200 with OAuth/database configured;
- `/api/readiness` is HTTP 200 with `environment: true`, `database: true`, `migrations: true`, `encryptionSchema: "v1"`;
- managed Google OAuth start uses identity + `drive.file` + `drive.appdata`, offline access, PKCE S256 and exact production callback;
- production security headers are present;
- production database migrations through `0005` are live;
- no grouped runtime errors were found in the inspected five-minute window after the successful deployment.

## Migration blocker resolved autonomously

The production migration build initially failed. A preview-only, rollback-only database probe was used to diagnose it without exposing database credentials or persisting diagnostic tables.

The probe proved:

- database/schema CREATE permissions were available;
- `_meshly_migrations` existed but migration `0001` had not been recorded;
- exact dry-run of `0001_meshly.sql` failed with PostgreSQL `42601` / `scanner_yyerror` at unquoted `offset`;
- the transaction rolled back fully.

`db/migrations/0001_meshly.sql` now quotes `"offset"`. Production then migrated and deployed successfully.

## Exact next action

The remaining blocker is user-authenticated Google interaction, which cannot be completed with repository/Vercel tooling alone.

1. User opens `https://meshly.cassielae.me` and completes Google sign-in/consent normally.
2. Do not share passwords, OAuth codes, cookies or tokens in chat.
3. After sign-in succeeds (or an error appears), continue from the observed result.
4. Then run a small encrypted Auto-account upload/download SHA-256 round trip, remote ciphertext/name inspection, and explicit-account round trip.

## Invariants

- Never request or store production secrets or Google credentials in chat/repository files.
- New Meshly-managed files remain encrypted before provider storage.
- Google managed files remain whole-file-only in one Google account.
- Current encryption is backend-trusted, not zero-knowledge.
- Production migrations are idempotent/checksum-verified and run only on Vercel production builds.
- Preview/local/CI builds must not mutate production database state.
- Repository/deployment state newer than this handoff wins.

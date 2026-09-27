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
- `TOKEN_ENCRYPTION_KEY` is now accepted by strict environment validation after the user configured it and redeployed.

## Current blocker

`GET /api/readiness` now returns HTTP **503** with:

```json
{"ok":false,"service":"meshly","environment":true,"database":true,"migrations":false}
```

This proves the production environment and database connection are valid. The next blocker is database schema migration state.

Meshly currently has migrations `0001` through `0005_managed_file_encryption.sql`, and `pnpm db:migrate` applies them transactionally while recording checksums in `_meshly_migrations`.

## Exact next action

1. Run `pnpm db:migrate` against the same production `DATABASE_URL` used by Meshly. Do this through a trusted local/Codespaces environment or the database provider's secure console; do not paste the URL into chat.
2. Re-run `https://meshly.cassielae.me/api/readiness`.
3. Require HTTP 200 with `environment`, `database`, and `migrations` all true.
4. Then continue real Google sign-in and encrypted Auto/manual upload/download SHA-256 verification.

## Invariants

- Never request or store production secrets in chat or repository files.
- New Meshly-managed files remain encrypted before provider storage.
- Google managed files remain whole-file-only in one Google account.
- Current encryption is backend-trusted, not zero-knowledge.
- Purpose-specific production secrets remain independent.
- Repository/deployment state newer than this handoff wins.

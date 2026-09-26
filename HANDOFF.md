# Meshly active handoff

> Read this after `AGENTS.md`. It records work that may be newer than the last verified milestone in `CHECKPOINT.md`.

**Updated:** 2026-09-27  
**Repository:** `cassielxyz/Meshly`  
**Active branch:** `work/production-live-verification`  
**Active PR:** pending  
**Current main:** `eb755a886162194b08f40e275cc96b2d6d90c418`  
**Last verified code milestone:** production preflight hardening (`bb079892b05cec46c1ac95dcb22fa4c6e01e8ab5`, CI `36269498896`)  
**Checkpoint-only CI:** `36279720209` — PASS

## Active task

Continue the real production verification phase from the deployed `main` build without storing credentials in Git or chat.

## Live production probe already completed

Production deployment for `main` commit `eb755a886162194b08f40e275cc96b2d6d90c418` is **READY** on `meshly.cassielae.me`.

Verified live without authentication:

- `/` → HTTP 200; current multicloud/encrypted landing page is deployed.
- `/privacy` → HTTP 200.
- `/terms` → HTTP 200.
- `/api/health` → HTTP 200 with `oauthConfigured: true` and `databaseConfigured: true`.
- `/api/auth/google/start` → HTTP 307 to Google with:
  - `openid`, `email`, `profile`;
  - `drive.file`, `drive.appdata`;
  - no full Drive scope in the managed flow;
  - `access_type=offline`;
  - PKCE S256;
  - callback `https://meshly.cassielae.me/api/auth/google/callback`.
- Production security headers are present on the deployed public surface, including CSP, HSTS, frame denial and `nosniff`.
- Vercel reported no grouped runtime errors in the inspected 24-hour window.

## Current blocker

`GET https://meshly.cassielae.me/api/readiness` returns HTTP **503** because production environment validation reports:

`missing: ["TOKEN_ENCRYPTION_KEY"]`

This is now the first blocking item. Database reachability/migrations are **not yet proven** by readiness because strict environment validation stops first.

`TOKEN_ENCRYPTION_KEY` must remain the current hardened format: exactly 32 cryptographically random raw bytes encoded as canonical Base64. Do not place the value in this repository, issues, screenshots or chat.

## Exact next action

1. Add `TOKEN_ENCRYPTION_KEY` to the Meshly **Production** environment in Vercel using a locally generated 32-byte Base64 value.
2. Redeploy production so the new environment value is loaded.
3. Re-run `/api/readiness` immediately.
4. If readiness advances to a database/migration failure, fix that next. If readiness is HTTP 200, continue to real Google sign-in and encrypted Auto/manual round-trip verification.

Safe local generation examples (run outside chat):

- `openssl rand -base64 32`
- `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

## Blockers outside code

The connected Vercel tooling available to the agent can inspect deployments and runtime state but does not expose an environment-variable write action. Therefore the production key must be added through the user-controlled Vercel environment/secret UI or another authorized secret-management path.

## Invariants

- Never request or store the actual production key in chat or repository files.
- New Meshly-managed files remain encrypted before provider storage.
- Google managed files remain whole-file-only in one Google account.
- Current encryption is backend-trusted, not zero-knowledge.
- Purpose-specific production secrets remain independent.
- Repository/deployment state newer than this handoff wins.

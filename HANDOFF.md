# Meshly active handoff

> Read this after `AGENTS.md`. It records work that may be newer than the last verified milestone in `CHECKPOINT.md`.

**Updated:** 2026-09-27  
**Repository:** `cassielxyz/Meshly`  
**Active branch:** `work/production-preflight-hardening`  
**Active PR:** `#6`  
**Verified runtime commit:** `bb079892b05cec46c1ac95dcb22fa4c6e01e8ab5`  
**Verified CI run:** `36269498896`

## Active task

Production preflight/environment hardening is implemented and the full CI gate has passed.

Verified work includes:

- exact canonical-base64 32-byte `TOKEN_ENCRYPTION_KEY` validation;
- HTTPS requirement outside localhost;
- exact Google callback binding to `NEXT_PUBLIC_APP_URL`;
- purpose-specific secret reuse rejection;
- environment validation tests;
- preflight checks for `/privacy`, `/terms`, readiness `encryptionSchema: v1`, OpenID identity scopes, managed Drive scopes, offline access, PKCE and exact callback;
- deployment guidance updated for the hardened validator/preflight.

## Verification state

GitHub Actions run `36269498896` passed frozen install, checkpoint validation, production dependency audit, lint, strict TypeScript, Vitest and optimized production build for `bb079892b05cec46c1ac95dcb22fa4c6e01e8ab5`.

This proves code/CI only. Real production database/OAuth/provider behavior remains pending.

## Exact next action

1. Let the checkpoint-only commit pass CI.
2. Merge PR #6 into `main`.
3. Continue production PostgreSQL/OAuth/environment/deployment setup using external secret storage only.
4. Run production preflight and all required real encrypted Google integration tests.

## Blockers outside code

Production PostgreSQL credentials, Google OAuth secret and application secrets are not configured. Never place them in repository checkpoint files, issues, screenshots or chat.

## Invariants

- New Meshly-managed files are encrypted before provider storage.
- Google managed files are whole-file-only in one Google account.
- Purpose-specific production secrets must be independent.
- Current encryption is backend-trusted, not zero-knowledge.
- Provider limits and terms must be respected.
- Repository commits newer than this handoff always win.

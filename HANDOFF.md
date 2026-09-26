# Meshly active handoff

> Read this after `AGENTS.md`. It records work that may be newer than the last verified milestone in `CHECKPOINT.md`.

**Updated:** 2026-09-27  
**Repository:** `cassielxyz/Meshly`  
**Active branch:** `work/production-preflight-hardening`  
**Active PR:** `#6`  
**Last verified runtime commit:** `71e164814de83d858d744d987b54443ef0019f95`  
**Last verified CI run:** `36268994840`

## Active task

Harden the code-side production configuration and preflight path before real credentials are supplied.

Implemented on the active branch:

- strict environment validation for the exact 32-byte canonical-base64 `TOKEN_ENCRYPTION_KEY`;
- production HTTPS enforcement outside localhost;
- exact Google callback origin/path binding to `NEXT_PUBLIC_APP_URL`;
- purpose-specific session/encryption/recovery/share/cron secret reuse rejection;
- environment tests for valid config and the new security invariants;
- production preflight checks for `/privacy`, `/terms`, `encryptionSchema: v1`, OpenID identity scopes, managed Drive scopes, offline access, PKCE and exact callback;
- deployment guide updated to explain the hardened checks.

## Verification state

This task is **verification pending** until PR #6 passes the full CI gate. Do not advance the canonical verified milestone before then.

## Exact next action

1. Inspect the newest PR #6 CI.
2. Fix only failing gates if needed.
3. When the full gate passes, checkpoint the production-preflight-hardening milestone, run checkpoint-only CI, then merge PR #6.
4. After merge, production PostgreSQL/OAuth/application secrets and deployed live verification remain external configuration work.

## Blockers outside code

Real production PostgreSQL, OAuth and application secret values are not configured. Never place them in repository checkpoint files, issues, screenshots or chat.

## Invariants

- New Meshly-managed files are encrypted before provider storage.
- Google managed files are whole-file-only in one Google account.
- Do not describe the current encryption design as zero-knowledge.
- Purpose-specific production secrets must be independent.
- Provider limits, terms, quotas and rate limits must not be bypassed.
- Repository commits newer than this handoff always win.

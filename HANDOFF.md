# Meshly active handoff

> Read this after `AGENTS.md`. It records work that may be newer than the last verified milestone in `CHECKPOINT.md`.

**Updated:** 2026-09-27  
**Repository:** `cassielxyz/Meshly`  
**Active branch:** `work/production-readiness-cleanup`  
**Active PR:** `#5`  
**Verified runtime commit:** `71e164814de83d858d744d987b54443ef0019f95`  
**Verified CI run:** `36268994840`

## Active task

The production-readiness cleanup + legal-pages implementation is complete and the full CI gate passed.

Verified work includes:

- stale Google cross-account production test/deployment guidance removed;
- README/current roadmap aligned with whole-file Google placement and encrypted managed files;
- production evidence template upgraded for Auto/manual encrypted Google round trips and ciphertext inspection;
- security policy expanded for encrypted managed-file trust boundaries;
- public `/privacy` and `/terms` routes implemented with reusable legal-page UI;
- public footer exposes Privacy and Terms;
- root metadata updated for multi-cloud encrypted storage;
- old split-Google storage-flow asset replaced with encrypted provider-aware flow;
- README banner refreshed for multi-cloud encrypted storage.

## Verification state

GitHub Actions run `36268994840` passed frozen install, checkpoint validation, production dependency audit, lint, strict TypeScript, Vitest and optimized production build for `71e164814de83d858d744d987b54443ef0019f95`.

This proves code/CI only. Real production database/OAuth/provider behavior remains pending.

## Exact next action

1. Let the checkpoint-only commit for this milestone pass CI.
2. Merge PR #5 into `main`.
3. Continue production PostgreSQL/OAuth/environment/deployment configuration without committing or pasting secrets.
4. Run production preflight and then the required real encrypted Google Auto/manual round-trip, ciphertext inspection, resume, integrity, recovery, sharing, cron and smoke tests.

## Blockers outside code

Real production PostgreSQL credentials, OAuth client secret and application secrets must be configured outside the repository. Never place them in checkpoint files, issues, screenshots or chat.

## Invariants

- New Meshly-managed files are encrypted before provider storage.
- Google managed files are whole-file-only in one Google account.
- Do not describe the current encryption design as zero-knowledge.
- Generic distributed parts require explicit provider capability.
- Provider limits, terms, quotas and rate limits must not be bypassed.
- Repository commits newer than this handoff always win.

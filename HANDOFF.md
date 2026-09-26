# Meshly active handoff

> Read this after `AGENTS.md`. It records work that may be newer than the last verified milestone in `CHECKPOINT.md`.

**Updated:** 2026-09-27  
**Repository:** `cassielxyz/Meshly`  
**Active branch:** `work/production-readiness-cleanup`  
**Active PR:** `#5`  
**Last verified runtime commit:** `c4cbebb0541637d1608f7372f9accb45366a5d74`  
**Last verified CI run:** `36268194577`

## Active task

Production-readiness cleanup after the verified public multicloud/encryption story.

Implemented on the active branch:

- README status/roadmap aligned to the current Google whole-file + encrypted managed-file model;
- production testing no longer asks Google managed files to span accounts;
- production integration evidence now covers encrypted Auto/manual Google round trips and provider ciphertext inspection;
- deployment guidance updated for encryption migration `0005`, legal URLs, Auto/manual destination verification, and current invariants;
- SECURITY documentation expanded for managed-file encryption, backend trust boundaries, and whole-file Google placement;
- public `/privacy` and `/terms` pages added with reusable legal-page chrome;
- Privacy/Terms links exposed through the public footer;
- root product metadata updated away from the old Google-only description;
- stale split-Google storage-flow documentation asset replaced with encrypted provider-aware placement;
- README banner refreshed for multi-cloud encrypted storage.

## Verification state

The implementation is **verification pending** until PR #5 passes the full CI gate. Do not advance the canonical verified milestone in `CHECKPOINT.md` before that succeeds.

## Exact next action

1. Run/inspect the newest PR #5 CI on `work/production-readiness-cleanup`.
2. If any gate fails, fix only the failing issue and verify again.
3. When frozen install, checkpoint validation, production dependency audit, lint, strict TypeScript, Vitest and production build all pass:
   - create `docs/checkpoints/2026-09-27-production-readiness-cleanup-and-legal-pages.md`;
   - advance `CHECKPOINT.md` and `.meshly/project-state.json`;
   - update the active checkpoint layers;
   - run the checkpoint-only CI;
   - merge PR #5.

## Blockers outside code

Real production PostgreSQL, production environment/OAuth credentials and deployed provider verification are not configured yet. Never place those secrets in repository checkpoint files, issues, screenshots or chat.

## Invariants

- New Meshly-managed files are encrypted before provider storage.
- Google managed files are whole-file-only in one Google account.
- Do not describe the current encryption design as zero-knowledge.
- Generic distributed parts require explicit provider capability.
- Provider limits, terms, quotas and rate limits must not be bypassed.
- Repository commits newer than this handoff always win.

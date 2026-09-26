# Meshly active handoff

> Read this after `AGENTS.md`. It records work that may be newer than the last verified milestone in `CHECKPOINT.md`.

**Updated:** 2026-09-27  
**Repository:** `cassielxyz/Meshly`  
**Active branch:** `work/public-multicloud-encryption-story`  
**Active PR:** `#4` — public multicloud + encrypted-storage story  
**Last fully verified milestone:** Google upload destination UI (`7c0439576f0844e177568b5134398172487fd57f`, CI `36265896346`)

## Active task

Replace the old public Google pooling/sharding story with the current product model:

- **Google Drives:** multiple connected accounts, but each new managed file stays whole in one Google account; user can use Auto choose or select an account.
- **Other Clouds:** separate provider area for supported adapters.
- **Managed storage encryption:** new managed files use encryption v1 before provider storage.
- **Provider-aware transfers:** resumable/retry/concurrency behavior follows provider capabilities and limits.

## Work already on the branch

- Landing copy and visuals were rewritten for the new product model.
- The former split-across-Google scroll animation was replaced with **encrypt → route to one Google account → verify**.
- `/demo` now teaches **Connect → Choose destination → Encrypt → Transfer → Verify & ready**.
- Demo fixtures no longer claim one Google-managed file spans accounts.
- A TypeScript union issue in the placement visual was fixed by making `selected` explicit on every demo account.

## Verification state

The first PR CI run failed at TypeScript before the placement-account typing fix. Treat the current branch as **verification pending** until a newer CI run passes the full gate.

Do not update the canonical verified commit/run in `CHECKPOINT.md` until the full gate succeeds.

## Exact next action

1. Inspect the newest PR #4 workflow run for the current branch head.
2. If any gate fails, fix only the failing issue and rerun.
3. When frozen install, checkpoint validation, audit, lint, typecheck, tests and production build all pass:
   - add/update the dated milestone checkpoint;
   - advance `CHECKPOINT.md`, `.meshly/project-state.json`, `.meshly/current-task.json`, and `.meshly/resume-state.json`;
   - merge PR #4;
   - then scan the repository for remaining obsolete Google pooling/sharding public copy.

## Blockers outside code

Production PostgreSQL, production environment/OAuth secrets, deployed preflight, and real provider round-trip verification still require production configuration. Never place those secrets in repository checkpoint files or chat.

## Invariants

- New Meshly-managed files are encrypted before provider storage.
- Google managed files are whole-file-only in one Google account.
- Do not describe the current encryption design as zero-knowledge.
- Generic distributed parts may only be used by providers/use cases that explicitly support them.
- Provider limits, terms, quotas and rate limits must not be bypassed.
- Repository commits newer than this handoff always win.

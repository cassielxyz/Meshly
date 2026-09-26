# Meshly agent continuation protocol

This file is mandatory reading for ChatGPT, Codex, Antigravity, Claude, Copilot, or any other coding agent working on Meshly.

## Checkpoint layers

Meshly uses both **verified milestone state** and **active-work state** so an interrupted chat does not lose partially completed work.

- `CHECKPOINT.md` — last verified milestone and ordered project next actions.
- `.meshly/project-state.json` — machine-readable verified project state.
- `docs/checkpoints/*` — dated milestone records.
- `HANDOFF.md` — active branch/PR, partial work, current verification state and blockers.
- `NEXT_ACTION.md` — one short, exact immediate action.
- `.meshly/current-task.json` — machine-readable active task.
- `.meshly/resume-state.json` — machine-readable resume pointer/read order.
- `CONTINUE.md` — copy-paste recovery prompt.

A checkpoint file is never allowed to overrule newer repository history. **Repository commits, PR state and CI newer than the checkpoint always win.**

## Start every continuation here

Before changing code:

1. Read `AGENTS.md` completely.
2. Read `HANDOFF.md` and `NEXT_ACTION.md`.
3. Read `CHECKPOINT.md` and `.meshly/project-state.json`.
4. Read `.meshly/current-task.json` and `.meshly/resume-state.json`.
5. Read the newest file in `docs/checkpoints/`.
6. Inspect current `main`, the active branch/PR named by the handoff, recent commits, and newest CI.
7. Reconcile repository state against the checkpoint layers. Never overwrite newer work because a checkpoint is stale.
8. Continue the first unfinished action. Do not restart completed milestones.

If an active-task file says verification is pending, inspect CI before calling that work complete.

## Mandatory checkpoint update rule

After every substantial milestone that is actually implemented and verified:

- update `CHECKPOINT.md`;
- update `.meshly/project-state.json`;
- update `HANDOFF.md` and `NEXT_ACTION.md`;
- update `.meshly/current-task.json` and `.meshly/resume-state.json`;
- add a dated file under `docs/checkpoints/` for a completed milestone;
- record the exact verified runtime commit and CI run where practical;
- distinguish code/CI verification from production credential-dependent integration testing;
- record blockers and the exact next action.

For work that is partially implemented but not verified, update only active-work state and mark it `verification_pending` or equivalent. Do not advance the canonical verified milestone until the full gate passes.

Never place API keys, OAuth secrets, database credentials, refresh tokens, upload-session URLs, encryption keys, user files, personal email addresses, or other secrets in checkpoint files.

## Recovery after chat/context loss

Do not rely on remembered conversation history. Reconstruct context in this order:

`AGENTS.md` → `HANDOFF.md` → `NEXT_ACTION.md` → `CHECKPOINT.md` → `.meshly/project-state.json` → `.meshly/current-task.json` → `.meshly/resume-state.json` → newest `docs/checkpoints/*` → current Git/PR/CI → relevant source files.

The repository should contain enough state to continue without asking the user to recreate the previous chat.

## Storage and security invariants that must not regress

- Every new Meshly-managed file uses the versioned encrypted managed-file format; there is no plaintext-storage toggle for new managed files.
- Google managed uploads store the whole file in one healthy Google account. Do not restore Google cross-account sharding.
- Auto placement or a user-selected Google destination must still preserve the whole-file rule.
- Generic persistent distributed parts are allowed only for a provider/use case that explicitly declares that capability.
- Multipart/resumable **transport** is not the same as persistent distributed storage.
- Never expose a logical file as ready until its required physical encrypted object(s) verify.
- Do not disconnect/delete a storage account while managed objects depend on it.
- Never log refresh tokens, upload session URLs, plaintext file keys, recovery/share secrets, or decrypted credentials.
- Recovery manifests must never contain OAuth refresh tokens, application secrets or plaintext file keys.
- Managed Google OAuth is the default narrow-scope mode. Full Drive mode is broader and must respect applicable Google production verification requirements.
- Current managed-file encryption is backend-trusted; do not call it zero-knowledge or provider-only E2EE.
- Provider limits, terms, quotas, paid features and rate limits must be respected; do not bypass them.
- Provider/transfer/encryption/manifest logic must remain reusable by future Android/desktop clients.

## Verification gate

Before calling a code milestone complete, run or confirm the equivalent CI sequence:

`pnpm checkpoint:check` → production dependency audit → `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build`

Credential-dependent database/OAuth/provider flows are separately tracked and must be verified only after real production configuration exists.

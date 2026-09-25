# Meshly agent continuation protocol

This file is mandatory reading for ChatGPT, Codex, Antigravity, Claude, Copilot, or any other coding agent working on Meshly.

## Start every continuation here

Before changing code:

1. Read `CHECKPOINT.md` completely.
2. Read `.meshly/project-state.json`.
3. Read the newest file in `docs/checkpoints/`.
4. Inspect the current `main` HEAD, recent commits, open PRs/issues if relevant, and the latest CI status.
5. Compare repository state against the checkpoint. **The repository is the source of truth when it is newer than the checkpoint.** Never overwrite newer work simply because a checkpoint is stale.
6. Continue from `Next actions` in `CHECKPOINT.md`; do not restart items marked complete.

## Mandatory checkpoint update rule

After every substantial milestone that is actually implemented and verified:

- Update `CHECKPOINT.md` with the new current state.
- Update `.meshly/project-state.json`.
- If a phase/milestone was completed, add a dated file under `docs/checkpoints/`.
- Record verification honestly: distinguish code/CI verification from real credential-dependent integration testing.
- Record blockers and exact next actions.
- Never place API keys, OAuth secrets, database credentials, tokens, user files, email addresses, or other secrets in checkpoint files.

Do not mark a task complete just because code exists. A completion entry should say how it was verified. If a test requires production credentials that are not configured, mark it `pending_integration`, not `complete`.

## Recovery after chat/context loss

If a previous AI conversation ended unexpectedly, do **not** rely on remembered chat history. Reconstruct context in this order:

`AGENTS.md` → `CHECKPOINT.md` → `.meshly/project-state.json` → latest `docs/checkpoints/*` → recent Git commits/diffs → latest CI → relevant source files.

Then continue only the unfinished work.

## Storage invariants that must not regress

- Prefer a whole file on one healthy account when safe capacity permits.
- Multipart files must preserve deterministic byte offsets/order and integrity metadata.
- Never expose a logical file as ready until every required physical part verifies.
- Do not disconnect/delete a storage account while managed chunks still depend on it.
- Never log refresh tokens, resumable upload session URLs, encryption keys, recovery/share secrets, or decrypted credentials.
- Managed mode is the default narrow-scope mode. Full Drive mode is broader and must respect Google's production verification requirements.
- Recovery manifests must never contain OAuth refresh tokens or application secrets.

## Verification gate

Before calling a code milestone complete, run or confirm the equivalent CI sequence:

`pnpm checkpoint:check` → `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build`

Credential-dependent Google/database flows are separately tracked in the checkpoint and must be tested after credentials are configured.

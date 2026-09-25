# Meshly checkpoint history

This directory stores durable milestone snapshots for AI continuation and human recovery.

## Rules

- `CHECKPOINT.md` at repository root is always the **current** checkpoint.
- `.meshly/project-state.json` is the machine-readable equivalent.
- Files in this directory are append-only milestone history. Do not rewrite old history to make it look cleaner.
- Create a new checkpoint file when a meaningful phase changes: architecture locked, production code complete, credentials integrated, production verified, release completed, etc.
- Small bug fixes inside the same phase usually update the root checkpoint and project-state file without creating a new historical milestone.
- Never store credentials or personal data in a checkpoint.

## What every milestone checkpoint should contain

1. Date and source commit.
2. Phase/status.
3. What was completed.
4. How it was verified.
5. What is explicitly **not** verified yet.
6. Known issues/blockers.
7. Exact ordered next actions.
8. Important invariants a future agent must preserve.

## Continuation behavior

A future agent must first read `AGENTS.md` and root `CHECKPOINT.md`. If the repository contains commits newer than the checkpoint, inspect and reconcile them before continuing. Never roll the code back to match an older checkpoint.

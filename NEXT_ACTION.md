# Meshly — next action

`CHECKPOINT.md` records the last verified milestone; `HANDOFF.md` records the active branch/PR.

## Do this next

1. Verify the checkpoint-only CI on **PR #6 / `work/production-preflight-hardening`**.
2. If green, merge PR #6 into `main`.
3. Continue production PostgreSQL, OAuth/environment configuration and deployment using external secret storage only.
4. Run automated production preflight and the required real encrypted Google Auto/manual round-trip tests before marking Meshly `production_verified`.

Never paste production secrets into chat or commit them to the repository.

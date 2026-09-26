# Meshly — next action

`CHECKPOINT.md` records the last verified milestone; `HANDOFF.md` records the active branch/PR.

## Do this next

1. Verify the checkpoint-only CI on **PR #5 / `work/production-readiness-cleanup`**.
2. If green, merge PR #5 into `main`.
3. Continue production PostgreSQL, OAuth/environment configuration and deployment using the secret manager/environment only.
4. Run automated preflight, then complete the required real encrypted Google Auto/manual round-trip and production integration tests before marking Meshly `production_verified`.

Never paste production secrets into chat or commit them to the repository.

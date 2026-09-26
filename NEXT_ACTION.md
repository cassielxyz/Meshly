# Meshly — next action

`CHECKPOINT.md` records the last verified milestone; `HANDOFF.md` records the active branch/PR.

## Do this next

1. Verify the full CI gate on **PR #6 / `work/production-preflight-hardening`**.
2. Fix any failing gate and verify again.
3. If green, checkpoint the production-preflight-hardening milestone, verify the checkpoint-only commit, then merge PR #6.
4. After merge, continue production database/OAuth/environment setup and live encrypted Google verification using external secret storage only.

Never paste production secrets into chat or commit them to the repository.

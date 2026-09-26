# Meshly — next action

`CHECKPOINT.md` records the last verified milestone; `HANDOFF.md` records the active branch/PR.

## Do this next

1. Verify the full CI gate on **PR #5 / `work/production-readiness-cleanup`**.
2. If CI fails, fix the failing gate and verify again.
3. If CI passes, checkpoint the production-readiness cleanup + public legal pages milestone, run checkpoint-only CI, then merge PR #5.
4. After merge, the next project phase is production PostgreSQL/OAuth/environment/deployment configuration followed by real encrypted Google Auto/manual round-trip verification.

Do not ask the user to paste production secrets into chat or commit them to the repository.

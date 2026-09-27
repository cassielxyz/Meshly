# Meshly — next action

`CHECKPOINT.md` records the latest verified production milestone. `HANDOFF.md` records active work that may be newer.

## Do this next

PR #13 contains the activation-gated encrypted Dropbox managed-transfer foundation. Branch CI `36320647090` passed install, checkpoint validation, audit, lint, typecheck, tests and build before the checkpoint-only follow-up commits.

1. Verify the newest PR #13 head still passes CI.
2. If green, merge PR #13 without enabling `DROPBOX_MANAGED_UPLOADS_ENABLED`.
3. Wait for the production deployment and migration runner to apply `0007_provider_objects.sql`.
4. Verify `https://meshly.cassielae.me/api/readiness` is HTTP 200 and reports `providerSchema: "v2"`.
5. Keep Dropbox managed uploads disabled until a real connected Dropbox test account passes encrypted upload/download SHA-256 equality, opaque-object inspection, interrupted/retried transfer, integrity scan, permanent delete and recovery restore.
6. Continue TeraBox encrypted-transfer implementation while external provider credentials are unavailable.

The separate authenticated Google verification is still required: **Show existing files** for the affected account, complete explicit read consent, verify older Drive files appear, refresh exact per-account quota, then run Google Auto and selected-account encrypted round trips.

Do not paste passwords, OAuth codes, cookies, provider tokens or secrets into chat.

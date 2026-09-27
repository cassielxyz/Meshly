# Meshly — next action

`CHECKPOINT.md` records the latest verified production milestone. `HANDOFF.md` records active work that may be newer.

## Do this next

PR #14 merged successfully into main as `a74596ae8a12c4c9025914112807162e9af17cce` after exact-head CI run `36344842001` passed install, checkpoint validation, audit, lint, typecheck, tests and production build.

Vercel did **not** deploy that main commit because the account hit the build-rate limit. GitHub status reports `Deployment rate limited — retry in 24 hours.` The last verified production runtime is still main `9018491a83d9663dc09b32c9889c3133cac15e01` / deployment `dpl_4yceJJbueyJS978P2sviWdPkQ2By`.

1. After the Vercel rate-limit window clears, retry/redeploy current main without enabling `DROPBOX_MANAGED_UPLOADS_ENABLED` or `TERABOX_MANAGED_UPLOADS_ENABLED`.
2. Verify the deployment becomes READY and `/api/readiness` reports `googleQuotaSchema: "v2"`, `providerSchema: "v2"`, migrations true and encryption schema v1.
3. Then use **Show existing files** in the authenticated browser, verify pre-existing Google Drive files are indexed, and compare refreshed total/Drive/trash/free values with Google.
4. Run encrypted Google Auto-account and selected-account SHA-256 round trips.
5. Configure Dropbox/TeraBox provider application credentials only outside chat/repository and run their real provider-specific verification before enabling either managed-upload gate.

Do not paste passwords, OAuth codes, cookies, provider tokens or secrets into chat.

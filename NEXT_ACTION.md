# Meshly — next action

`CHECKPOINT.md` records the latest verified production milestone. `HANDOFF.md` records active work that may be newer.

## Do this next

Main `9018491a83d9663dc09b32c9889c3133cac15e01` is deployed and production readiness is HTTP 200 with provider schema v2. PR #14 now contains the Google quota-category correction plus the activation-gated encrypted TeraBox small-file path and user-facing gated provider upload controls.

1. Verify CI for the newest PR #14 head; fix any checkpoint, lint, typecheck, test, audit or build failure before merge.
2. Keep both `DROPBOX_MANAGED_UPLOADS_ENABLED` and `TERABOX_MANAGED_UPLOADS_ENABLED` off unless their provider-specific live verification has passed.
3. Merge PR #14 only when its exact head is green.
4. After the production deploy, verify migration `0008_google_quota_breakdown.sql` is live and `/api/readiness` reports `googleQuotaSchema: "v2"` together with provider schema v2.
5. In the authenticated production browser, use **Show existing files**, verify pre-existing Google Drive files are indexed, and compare refreshed total Google usage, Drive usage, Drive-trash usage and free capacity with Google.
6. Run encrypted Google Auto-account and selected-account SHA-256 round trips.
7. When Dropbox/TeraBox application credentials are configured outside chat, run real auth/quota/browse and encrypted transfer/integrity/delete/recovery tests before enabling either provider upload gate.

Do not paste passwords, OAuth codes, cookies, provider tokens or secrets into chat.

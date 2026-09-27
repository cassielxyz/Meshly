# 2026-09-28 — Dropbox encrypted-transfer foundation deployed

## Verified milestone

Meshly main commit `9018491a83d9663dc09b32c9889c3133cac15e01` (PR #13) is deployed to production as Vercel deployment `dpl_4yceJJbueyJS978P2sviWdPkQ2By`.

PR #13 head `a5fb4aff08ef7cb6a15a8f5bf969749a091c8559` passed Meshly CI run `36321037829`, covering frozen install, checkpoint validation, production dependency audit, lint, strict TypeScript, tests and production build.

Live `https://meshly.cassielae.me/api/readiness` returns HTTP 200 with `environment: true`, `database: true`, `migrations: true`, `encryptionSchema: "v1"` and `providerSchema: "v2"`. This verifies that the provider-object persistence migration is deployed enough for the readiness schema contract.

## What is deployed

- Provider account persistence and official Dropbox/TeraBox connection, quota and browse foundations.
- `provider_objects` persistence for encrypted managed objects.
- Activation-gated encrypted Dropbox upload/download implementation with opaque object names, remote verification before logical readiness, delete/disconnect guards, integrity integration and recovery-manifest v3 support.
- `DROPBOX_MANAGED_UPLOADS_ENABLED` remains a safety gate and must stay off until live provider-specific transfer verification passes.

## What this milestone does NOT prove

This is not `production_verified`. It does not prove a real Dropbox encrypted round trip, provider retry/resume behavior, provider-side ciphertext inspection, integrity/delete/recovery rehearsal, Google existing-file indexing, exact user-visible Google quota comparison, Google encrypted Auto/selected-account round trips, TeraBox encrypted transfers, or MEGA SDK integration.

## Active continuation

Work continues on PR #14 / `work/terabox-encrypted-transfers`: exact Google quota-category reporting plus an activation-gated TeraBox encrypted small-file transfer path. TeraBox uploads must remain disabled until provider credentials and live tests verify the implementation. Large TeraBox transfers remain reserved for a dedicated transfer worker.

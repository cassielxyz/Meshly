# Meshly — canonical continuation checkpoint

> **READ THIS BEFORE CONTINUING.** Also read `AGENTS.md`, `HANDOFF.md`, `NEXT_ACTION.md`, `.meshly/project-state.json`, `.meshly/current-task.json`, `.meshly/resume-state.json`, and the newest file under `docs/checkpoints/`. Newer repository commits and live deployment state always win over this document.

**Checkpoint date:** 2026-10-02  
**Repository:** `cassielxyz/Meshly`  
**Branch:** `main`  
**Current main / latest verified runtime commit:** `069878312a9409148dde34fad031b4ff5c7fee6d`  
**Latest verified implementation CI run:** `36919473571` (PR #16 exact head `7cf7b84ed7eea07c99b5ed62a0ad59d0c77a529f`)  
**Verified production deployment:** `dpl_9uUDaEdaNxXkGDPGtRYUkY2bkGzb`  
**Latest verified production milestone record:** `docs/checkpoints/2026-10-02-workspace-terabox-worker-deployed.md`

## Current state

Meshly production at `https://meshly.cassielae.me` is serving main `069878312a9409148dde34fad031b4ff5c7fee6d`. The deployment is **READY** and live `/api/readiness` returns HTTP 200 with environment, database and migrations true, `encryptionSchema: "v1"`, `providerSchema: "v2"` and `googleQuotaSchema: "v2"`.

The old Vercel build-rate blocker is cleared. Migration `0008_google_quota_breakdown.sql` and the Google quota-category model are live. PR #16 was exact-head CI verified, squash-merged, deployed, and adds the completed core workspace UX plus the activation-gated TeraBox large-file ciphertext worker foundation.

Google supports narrow managed mode plus a targeted **Show existing files** upgrade using read-only Drive access. A real user-completed broader-read consent and initial index is still required before claiming that pre-existing Drive files are verified in production. Exact quota values also still need browser-visible comparison against Google for the connected account.

Dropbox and TeraBox connection/browse foundations are implemented. Their encrypted managed-upload paths remain feature-gated until real provider-specific live verification passes. The TeraBox large-file worker code is deployed but intentionally inactive until its separate worker deployment and real provider round-trip are verified.

Do **not** call Meshly `production_verified` yet.

## Completed in code and deployed

- Responsive logical filesystem, bulk file actions, filters, sorting, saved list/grid view and density.
- Richer share creation with optional password, expiry and download limits.
- Download activity/history and bounded workspace Analytics.
- Managed Google OAuth plus targeted optional Full Drive indexing (`drive.readonly` + `drive.file` + `drive.appdata`).
- Per-account Google quota refresh and quota breakdown for total Google usage, Drive usage and Drive-trash usage.
- Google whole-file-only Auto/manual placement.
- Mandatory managed encryption v1 with opaque remote objects.
- Provider-account persistence plus official Dropbox/TeraBox auth, quota and browse foundations.
- Activation-gated encrypted Dropbox managed uploads with resumable offset reconciliation, encrypted ranged download/decrypt, remote verification, integrity/delete/recovery integration.
- Activation-gated encrypted TeraBox small-file planning/upload/verification/download/decrypt/abort/delete.
- Dedicated activation-gated TeraBox large-file worker architecture: ciphertext-only browser-to-worker transport, scoped HMAC capability, authenticated app/worker control plane, temporary ciphertext cleanup and provider-part verification.
- TeraBox provider transport parts are independent from Meshly encryption-frame boundaries. Multipart layouts guarantee every provider fragment, including the final fragment, is greater than 4 MiB and unsafe layouts fail closed.
- Other Clouds UI backed by provider state rather than static placeholders.
- MEGA remains explicitly unavailable until an official SDK-backed worker is implemented.
- Public multicloud/encryption landing, legal pages, strict production environment validation and production-only checksum-verified migrations.
- Durable canonical + active-work checkpoint layers.

## Verification already completed

PR #16 exact head `7cf7b84ed7eea07c99b5ed62a0ad59d0c77a529f` passed GitHub Actions run `36919473571`: frozen dependency install, checkpoint validation, production dependency audit, lint, strict TypeScript, Vitest and production build.

The final TeraBox transport hardening specifically verifies provider-safe part planning around the 4 MiB multipart boundary and rejects a signed layout that would leave an undersized final fragment.

Main `069878312a9409148dde34fad031b4ff5c7fee6d` deployed successfully as `dpl_9uUDaEdaNxXkGDPGtRYUkY2bkGzb`, state **READY**.

Live production `/api/readiness` confirms:

- HTTP 200;
- `environment: true`;
- `database: true`;
- `migrations: true`;
- `encryptionSchema: "v1"`;
- `providerSchema: "v2"`;
- `googleQuotaSchema: "v2"`.

Production security headers remain present. Provider activation gates remain fail-closed unless explicitly configured after provider-specific verification.

## Encryption trust model

Do **not** call the current design zero-knowledge or provider-only E2EE. Meshly's authenticated planning/download paths participate in file-key handling. Providers receive ciphertext for new managed files, but the Meshly backend is trusted by the current design.

## NOT yet proven with real production credentials

- user-completed Google existing-file consent + successful initial index of pre-existing files;
- exact browser-visible Google total/Drive/trash/free comparison against the provider;
- real encrypted Google Auto-account and explicitly selected-account upload/download SHA-256 round trips;
- provider-side inspection of a real Google managed ciphertext object;
- real Dropbox OAuth/quota/browse plus encrypted managed upload/download SHA-256 equality and retry/integrity/delete/recovery rehearsal;
- real TeraBox auth/quota/browse plus encrypted managed small-file transfer verification;
- deployed TeraBox large-file worker health/connectivity and real multipart encrypted round trip, fragment-size verification, download/hash/integrity/abort cleanup;
- MEGA official-SDK worker integration;
- final sharing, cron and desktop/mobile authenticated smoke tests.

## Next actions — do these in order

1. In the authenticated production browser, use **Show existing files** for the connected Google account, complete the broader read-only consent, run the initial index and confirm pre-existing Google Drive files appear.
2. Refresh the account and compare Meshly's total Google usage, Drive usage, Drive trash and free space against Google for the same account.
3. Run encrypted Google Auto + explicit-account upload/download SHA-256 round trips and inspect the opaque provider object.
4. Configure Dropbox/TeraBox application credentials only outside chat/repository and run provider-specific auth/quota/browse/transfer/integrity/delete/recovery tests before enabling either managed-upload gate.
5. Deploy the dedicated TeraBox worker separately with its independent secrets, keep `TERABOX_LARGE_WORKER_ENABLED=false`, verify worker health/internal connectivity and a real multi-part encrypted provider round trip, then enable only after all checks pass.
6. Implement the official-SDK-backed MEGA worker before presenting MEGA managed transfers as active.
7. Advance to `production_verified` only after all required live tests genuinely pass.

## Invariants

- Every new Meshly-managed file uses encryption v1.
- Google managed files stay whole in one Google account; no cross-account Google sharding.
- Pre-existing Google files are indexed only after explicit broader read consent.
- No logical managed file becomes `ready` before its remote encrypted object verifies.
- Provider connection/browsing does not equal encrypted managed-upload support.
- Provider upload gates remain off until provider-specific live verification passes.
- TeraBox encryption frames and provider transport fragments are independent; multipart provider fragments must satisfy provider size rules.
- Production migrations are transactional, checksum-verified and production-only during Vercel builds.
- Preview/local/CI builds do not mutate the production database.
- Never place production secrets, provider tokens, OAuth codes, cookies or plaintext file keys in repository/checkpoint files/issues/screenshots/chat.
- Current encryption is backend-trusted, not zero-knowledge.
- Provider limits, supported APIs/SDKs and terms must be respected.
- Repository/deployment state newer than this checkpoint wins.

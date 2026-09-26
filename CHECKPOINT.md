# Meshly — canonical continuation checkpoint

> **READ THIS BEFORE CONTINUING.** Also read `AGENTS.md`, `.meshly/project-state.json`, and the newest file under `docs/checkpoints/`. Newer repository commits always win over this document.

**Checkpoint date:** 2026-09-27  
**Repository:** `cassielxyz/Meshly`  
**Branch:** `main`  
**Latest verified runtime commit:** `794e04f890dcbfc1b42310a069e789c51447a4cc`  
**Latest verified CI run:** `36264515505`  
**Latest milestone record:** `docs/checkpoints/2026-09-27-multicloud-provider-foundation.md`

## Current state

Meshly has moved from a Google-only pooled-storage product to a **provider-independent multi-cloud workspace**. Google Drives and Other Clouds are separate product areas. Google managed uploads are now whole-file-only and no longer use cross-account sharding.

The multi-cloud provider foundation is implemented and CI verified. The next code milestone is **mandatory encryption of every Meshly-managed file object before cloud storage**.

Production credentials/database/deployed integration are still pending. Do not mark them verified based on CI alone.

## Completed in code

- Existing responsive logical filesystem, file/folder operations, sharing, integrity, recovery, diagnostics and production hardening.
- Managed Google OAuth mode plus optional Full Drive indexing code.
- Google Drive resumable upload/session flow and remote commit verification.
- Google account health/quota refresh and disconnect safeguards.
- Provider registry for Google Drive, TeraBox, Dropbox, MEGA and experimental MediaFire.
- Dedicated **Google Drives** navigation area and dedicated **Other Clouds** workspace.
- Google managed-file planner defaults to one whole file in one selected/automatically chosen Google account.
- Optional `accountId` destination is accepted by the Google upload planner API.
- Google cross-account sharding is disabled in the production upload planner.
- Generic deterministic split logic remains available only behind explicit `allowCrossAccountSplit: true` for future providers/use cases that permit it.
- Provider-aware transfer profiles and bounded retry/backoff helpers.
- Conservative TeraBox transfer profile: one active file, one upload part, fixed concurrency initially.
- rclone, Cloudreve, OpenList/AList and TeraBox uploader projects documented as design references; official provider APIs/SDKs remain the production path.
- Architecture keeps provider/transfer/encryption policy outside UI code for a future Android client.
- README updated to describe the multi-cloud direction honestly and identify mandatory file encryption as the next milestone.
- Durable AI continuation/checkpoint system.

## Verification already completed

GitHub Actions run `36264515505` for commit `794e04f890dcbfc1b42310a069e789c51447a4cc` passed:

- frozen dependency install: **PASS**
- checkpoint validation: **PASS**
- production dependency security audit: **PASS**
- ESLint: **PASS**
- strict TypeScript: **PASS**
- Vitest: **PASS**
- optimized Next.js production build: **PASS**

This is code/CI verification only.

## NOT yet proven with real production credentials

- Hosted TLS PostgreSQL + production migration.
- Complete production environment variables.
- Deployed production preflight.
- Real Google OAuth callback.
- Real whole-file upload/download round trip on one Google account.
- Manual selected-Google-account round trip.
- Interrupted/resumed upload test.
- Full Drive index/change sync if broader mode is enabled.
- Real integrity scan and recovery rehearsal.
- Real sharing controls and Vercel cron authentication.
- Desktop/mobile deployed visual smoke test.

## Pending implementation after product-direction change

- Mandatory encrypted file-byte/object format for all Meshly-managed uploads.
- Per-file random data-encryption keys and wrapped-key lifecycle.
- Streaming/framed encryption suitable for large files and resumable uploads.
- Encrypted-object size/hash verification.
- Decryption/reconstruction on download, including HTTP Range semantics.
- Encryption-aware integrity scanning, sharing and recovery manifests.
- Manual Google destination selector in upload UI.
- Public landing/demo copy and visuals updated away from Google cross-account sharding.
- Real TeraBox OAuth/API adapter.
- Real Dropbox adapter.
- Real MEGA adapter.
- Verify current MediaFire production API suitability before enabling it.
- Android client after the provider/encryption format is stable.

## Next actions — do these in order

1. Implement a versioned encrypted object format for Meshly-managed files with streaming/framed AES-256-GCM and per-file keys.
2. Add schema migration for encrypted-file metadata, wrapped keys, frame parameters and physical ciphertext sizes/hashes.
3. Update browser upload preparation so providers receive ciphertext only.
4. Update Google upload planning/commit verification for ciphertext size and integrity metadata.
5. Update managed-file download to verify/decrypt encrypted frames and preserve logical file integrity/range behavior.
6. Extend integrity, recovery and sharing paths for encrypted managed objects.
7. Add unit/integration tests for encryption round trips, tamper detection, large-frame boundaries, resume boundaries and key wrapping.
8. Add manual Google-account destination selection UI.
9. Update landing and `/demo` to the new Google Drives + Other Clouds product story.
10. Implement the supported TeraBox API adapter behind the provider registry and conservative transfer queue.
11. Add Dropbox and MEGA adapters; keep MediaFire disabled until API viability is verified.
12. Re-run the full CI gate after each milestone and update checkpoint records.
13. Then resume production database/credentials/deployment preflight and real provider integration verification.

## Invariants

- Every new Meshly-managed file must ultimately use the versioned encrypted object format; no plaintext-storage toggle.
- Do not claim mandatory file encryption is complete until upload, cloud object, download/decrypt and integrity tests pass.
- Google Drive managed files stay whole in one account; do not re-enable Google cross-account sharding.
- Transport multipart/chunking is not the same as persistent distributed storage parts.
- Provider limits and terms must be respected; do not implement paid-feature, quota, ad or rate-limit bypasses.
- Prefer supported official APIs/SDKs for production provider adapters.
- Never expose a logical file as ready before all required physical objects verify.
- Never log provider credentials, resumable session URLs, plaintext encryption keys or recovery/share secrets.
- Recovery manifests must not contain OAuth refresh tokens or plaintext file keys.
- New provider adapters must be capability/test gated before activation.
- Provider/encryption/manifest logic must remain reusable by the future Android client.
- Repository state newer than this checkpoint wins.

## Continuation prompt

> Open `cassielxyz/Meshly`. Read `AGENTS.md`, `CHECKPOINT.md`, `.meshly/project-state.json`, and the newest `docs/checkpoints/*`. Inspect newer commits/PRs/CI. Continue from the first unfinished Next action. Do not restore the old Google cross-account sharding product model.

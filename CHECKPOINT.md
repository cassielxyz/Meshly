# Meshly — canonical continuation checkpoint

> **READ THIS BEFORE CONTINUING.** Also read `AGENTS.md`, `.meshly/project-state.json`, and the newest file under `docs/checkpoints/`. Newer repository commits always win over this document.

**Checkpoint date:** 2026-09-27  
**Repository:** `cassielxyz/Meshly`  
**Branch:** `main`  
**Latest verified runtime commit:** `e840debf672dbd4afcc902a8c696c727aac74cd8`  
**Latest verified CI run:** `36265487653`  
**Latest milestone record:** `docs/checkpoints/2026-09-27-mandatory-managed-file-encryption.md`

## Current state

Meshly is a provider-independent multi-cloud workspace with separate **Google Drives** and **Other Clouds** areas. Google managed uploads use whole-file placement only; Google cross-account sharding stays disabled.

The first versioned mandatory encrypted managed-file format is implemented and CI verified. Every **new Meshly-managed upload** is encrypted before provider storage. Existing legacy managed files and externally indexed Drive files remain readable for compatibility.

Production database/credentials/deployed provider verification are still pending. Do not treat CI as proof of a live Google round trip.

## Completed in code

- Responsive logical filesystem, folders/files, search, recent/starred/trash, sharing, diagnostics and production hardening.
- Managed Google OAuth mode plus optional Full Drive indexing code.
- Provider registry for Google Drive, TeraBox, Dropbox, MEGA and experimental MediaFire.
- Dedicated **Google Drives** and **Other Clouds** areas.
- Google whole-file-only managed placement with optional planner/API `accountId` destination.
- Provider-aware transfer profiles and retry/backoff helpers.
- Conservative TeraBox profile: one active file and one upload part at a time initially.
- Open-source storage references documented for rclone, Cloudreve, OpenList/AList and TeraBox uploader implementations.
- Encryption v1 for all new Meshly-managed files:
  - random 256-bit per-file data key;
  - HKDF-domain-separated wrapping key derived from `TOKEN_ENCRYPTION_KEY`;
  - AES-256-GCM wrapped per-file key;
  - framed AES-256-GCM file encryption;
  - unique nonce prefix + frame index IV construction;
  - authenticated frame AAD;
  - exact 8 MiB full ciphertext frames for deterministic resumable boundaries;
  - opaque provider object names;
  - separate plaintext and ciphertext hashes/sizes.
- Browser encrypts managed upload bytes before they are sent to Google resumable sessions.
- Upload commit verifies encrypted physical object binding, size and provider checksum when available.
- Managed downloads authenticate/decrypt only required frames and preserve HTTP Range behavior.
- Integrity scanning understands encrypted physical size/checksum.
- Recovery snapshots preserve wrapped encryption metadata and never plaintext file keys.
- Database migration `0005_managed_file_encryption.sql` and readiness schema checks.
- Encryption tests for framing, key wrapping/binding, round trips and ciphertext tamper detection.
- Provider/encryption/manifest layers remain reusable for a future Android client.
- Durable AI continuation/checkpoint system.

## Verification already completed

GitHub Actions run `36265487653` for runtime commit `e840debf672dbd4afcc902a8c696c727aac74cd8` passed:

- frozen dependency install: **PASS**
- checkpoint validation: **PASS**
- production dependency security audit: **PASS**
- ESLint: **PASS**
- strict TypeScript: **PASS**
- Vitest: **PASS**
- optimized Next.js production build: **PASS**

This is code/CI verification only.

## Encryption trust model

Do **not** call the current design zero-knowledge or provider-only E2EE. The authenticated planning endpoint generates the random file key and returns it to the browser over TLS while persisting only the wrapped form. The authenticated server download path unwraps keys for decryption/range streaming.

Cloud providers receive ciphertext for new managed files, but the Meshly backend is trusted by the current design.

## NOT yet proven with real production credentials

- Hosted TLS PostgreSQL + all migrations through `0005`.
- Complete production environment variables.
- Deployed production preflight/readiness with encryption schema.
- Real Google OAuth callback.
- Real encrypted managed upload where the Drive object is opaque ciphertext.
- Download/decrypt SHA-256 equality with the source file.
- Manual selected-Google-account round trip.
- Interrupted/resumed encrypted upload at frame boundaries.
- Real integrity scan after encrypted upload.
- Recovery snapshot + restore + decrypt rehearsal.
- Real sharing of encrypted managed files.
- Vercel cron authentication.
- Desktop/mobile deployed visual smoke test.
- Full Drive index/change sync if broader mode is enabled.

## Next actions — do these in order

1. Add manual Google-account destination selection to the upload UI and apply it to file/folder uploads.
2. Rename remaining UI wording such as old "storage pool" language so Google capacity is described as available across connected Google accounts, not one pooled quota.
3. Update landing and `/demo` away from Google cross-account sharding and show the Google Drives + Other Clouds + encryption model.
4. Finish production PostgreSQL and run migrations through `0005_managed_file_encryption.sql`.
5. Finish production env/OAuth and deploy.
6. Run real encrypted Google upload/download SHA-256 round trips and inspect the remote object to confirm opaque ciphertext/name.
7. Test interrupted/resumed encrypted upload, integrity, recovery and sharing on the deployed app.
8. Implement the supported TeraBox API adapter behind the provider registry and conservative sequential queue.
9. Add Dropbox and MEGA adapters; keep MediaFire disabled until current API viability is verified.
10. Build Android only after the provider/encryption format and real provider behavior are stable.

## Invariants

- Every new Meshly-managed file uses encryption v1; there is no plaintext-storage toggle.
- Do not claim production encryption verification until a real provider upload/download round trip succeeds.
- Never persist or log plaintext file keys, OAuth credentials, resumable session URLs or application secrets.
- Recovery manifests never contain OAuth refresh tokens or plaintext file keys.
- Google managed files stay whole in one account; do not re-enable Google cross-account sharding.
- Transport multipart/chunking is not the same as persistent distributed storage parts.
- Provider limits and terms must be respected; do not implement paid-feature, quota, ad or rate-limit bypasses.
- Prefer supported official APIs/SDKs for production provider adapters.
- Never expose a logical file as ready before its required physical encrypted object verifies.
- Do not disconnect storage while managed objects depend on it.
- Provider adapters are capability/test gated before activation.
- Provider/encryption/manifest logic remains reusable by the future Android client.
- Repository state newer than this checkpoint wins.

## Continuation prompt

> Open `cassielxyz/Meshly`. Read `AGENTS.md`, `CHECKPOINT.md`, `.meshly/project-state.json`, and the newest `docs/checkpoints/*`. Inspect newer commits/PRs/CI. Continue from the first unfinished Next action. Preserve mandatory encryption v1 for new managed files and do not restore Google cross-account sharding.

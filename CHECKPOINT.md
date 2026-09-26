# Meshly — canonical continuation checkpoint

> **READ THIS BEFORE CONTINUING.** Also read `AGENTS.md`, `HANDOFF.md`, `NEXT_ACTION.md`, `.meshly/project-state.json`, `.meshly/current-task.json`, `.meshly/resume-state.json`, and the newest file under `docs/checkpoints/`. Newer repository commits always win over this document.

**Checkpoint date:** 2026-09-27  
**Repository:** `cassielxyz/Meshly`  
**Branch:** `main`  
**Latest verified runtime commit:** `71e164814de83d858d744d987b54443ef0019f95`  
**Latest verified CI run:** `36268994840`  
**Latest milestone record:** `docs/checkpoints/2026-09-27-production-readiness-cleanup-and-legal-pages.md`

## Current state

Meshly is a provider-independent multi-cloud workspace with separate **Google Drives** and **Other Clouds** areas. Google managed uploads use whole-file placement only; Google cross-account sharding stays disabled.

Every **new Meshly-managed upload** uses encryption v1 before provider storage. Existing legacy managed files and externally indexed Drive files remain readable for compatibility.

The Google upload UI supports **Auto choose** or a specific healthy connected Google account for both file and folder uploads. Public landing/demo content matches this architecture and shows encrypt → route/transfer → verify instead of the retired split-across-Google story.

Production-readiness documentation now matches the current model: required live tests cover encrypted whole-file Auto/manual Google placement, opaque ciphertext inspection, resumable encrypted transfer, integrity, recovery, sharing and smoke tests. Public `/privacy` and `/terms` pages and footer links are implemented for OAuth/product transparency.

Meshly uses layered durable continuation files so interrupted AI sessions can recover both the last verified milestone and in-flight branch state without reconstructing chat history.

Production database/credentials/deployed provider verification are still pending. Do not treat CI as proof of a live Google round trip.

## Completed in code

- Responsive logical filesystem, folders/files, search, recent/starred/trash, sharing, diagnostics and production hardening.
- Managed Google OAuth mode plus optional Full Drive indexing code.
- Provider registry for Google Drive, TeraBox, Dropbox, MEGA and experimental MediaFire.
- Dedicated **Google Drives** and **Other Clouds** areas.
- Google whole-file-only managed placement; cross-account Google sharding disabled.
- Auto choose or explicit healthy Google-account destination selection for file and folder uploads.
- Provider-aware transfer profiles and retry/backoff helpers.
- Conservative TeraBox transfer profile pending a real adapter.
- Encryption v1 for all new Meshly-managed files: per-file random 256-bit keys, AES-256-GCM framing, wrapped file keys, opaque provider object names, separate plaintext/ciphertext integrity metadata and authenticated range decryption.
- Encryption-aware integrity scanning, recovery metadata and migration `0005_managed_file_encryption.sql`.
- Public landing/demo architecture refresh aligned to Google whole-file placement, Other Clouds, and mandatory managed-file encryption.
- Public `/privacy` and `/terms` pages with shared legal-page chrome and public footer links.
- README, deployment guide, production-test plan, integration evidence template and security policy aligned to the encrypted whole-file Google model.
- Documentation storage-flow and banner assets refreshed to remove the obsolete split-Google story.
- Root product metadata updated for multi-cloud encrypted storage.
- Durable checkpoint system with verified-state and active-work layers.
- Provider/encryption/manifest layers remain reusable for a future Android client.

## Verification already completed

GitHub Actions run `36268994840` for runtime/checkpoint-task commit `71e164814de83d858d744d987b54443ef0019f95` passed:

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
- Deployed `/privacy` and `/terms` on the final production origin.
- Deployed production preflight/readiness with encryption schema.
- Real Google OAuth callback.
- Real encrypted managed upload where the Drive object is opaque ciphertext.
- Download/decrypt SHA-256 equality with the source file.
- Auto-choice and manually selected Google-account round trips.
- Interrupted/resumed encrypted upload at valid encrypted-frame/transport boundaries.
- Real integrity scan after encrypted upload.
- Recovery snapshot + restore + decrypt rehearsal.
- Real sharing of encrypted managed files.
- Vercel cron authentication.
- Desktop/mobile deployed visual smoke test.
- Full Drive index/change sync if broader mode is enabled.

## Next actions — do these in order

1. Finish production PostgreSQL and run migrations through `0005_managed_file_encryption.sql`.
2. Finish production environment/OAuth configuration and deploy the current candidate, including the public Privacy and Terms URLs.
3. Run automated production preflight and require readiness environment/database/migrations to pass.
4. Run real encrypted Google upload/download SHA-256 round trips for both Auto and explicitly selected accounts; inspect the remote object for opaque ciphertext/name.
5. Test interrupted/resumed encrypted upload, integrity, recovery, sharing, cron authentication and desktop/mobile deployment smoke tests.
6. Run release verification and checkpoint `production_verified` only after every required live test genuinely passes.
7. Implement the supported TeraBox API adapter behind the provider registry and conservative sequential queue.
8. Add Dropbox and MEGA adapters; keep MediaFire disabled until current API viability is verified.
9. Build Android only after provider/encryption format and real provider behavior are stable.

## Invariants

- Every new Meshly-managed file uses encryption v1; there is no plaintext-storage toggle.
- Do not claim production encryption verification until a real provider upload/download round trip succeeds.
- Never persist or log plaintext file keys, OAuth credentials, resumable session URLs or application secrets.
- Recovery manifests never contain OAuth refresh tokens or plaintext file keys.
- Google managed files stay whole in one account; do not re-enable Google cross-account sharding.
- Auto/manual Google destination selection must preserve the whole-file rule.
- Transport multipart/chunking is not the same as persistent distributed storage parts.
- Generic distributed storage parts require explicit provider capability/opt-in.
- Provider limits and terms must be respected; do not implement paid-feature, quota, ad or rate-limit bypasses.
- Prefer supported official provider APIs/SDKs for production provider adapters.
- Never expose a logical file as ready before its required physical encrypted object verifies.
- Do not disconnect storage while managed objects depend on it.
- Provider adapters are capability/test gated before activation.
- Provider/encryption/manifest logic remains reusable by the future Android client.
- Repository state newer than this checkpoint wins.

## Continuation prompt

> Open `cassielxyz/Meshly`. Read `AGENTS.md`, `HANDOFF.md`, `NEXT_ACTION.md`, `CHECKPOINT.md`, `.meshly/project-state.json`, `.meshly/current-task.json`, `.meshly/resume-state.json`, and the newest `docs/checkpoints/*`. Inspect newer main/branch commits, PRs and CI. Continue from the first unfinished action. Preserve mandatory encryption v1 for new managed files and never restore Google cross-account sharding.

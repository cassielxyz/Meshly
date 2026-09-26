# Meshly — canonical continuation checkpoint

> **READ THIS BEFORE CONTINUING.** Also read `AGENTS.md`, `HANDOFF.md`, `NEXT_ACTION.md`, `.meshly/project-state.json`, `.meshly/current-task.json`, `.meshly/resume-state.json`, and the newest file under `docs/checkpoints/`. Newer repository commits always win over this document.

**Checkpoint date:** 2026-09-27  
**Repository:** `cassielxyz/Meshly`  
**Branch:** `main`  
**Latest verified runtime commit:** `bb079892b05cec46c1ac95dcb22fa4c6e01e8ab5`  
**Latest verified CI run:** `36269498896`  
**Latest milestone record:** `docs/checkpoints/2026-09-27-production-preflight-hardening.md`

## Current state

Meshly is a provider-independent multi-cloud workspace with separate **Google Drives** and **Other Clouds** areas. Google managed uploads use whole-file placement only; Google cross-account sharding stays disabled.

Every **new Meshly-managed upload** uses encryption v1 before provider storage. Existing legacy managed files and externally indexed Drive files remain readable for compatibility.

The production configuration path is now hardened in code: environment validation enforces HTTPS outside localhost, an exact Google callback bound to `NEXT_PUBLIC_APP_URL`, an exact canonical-base64 32-byte `TOKEN_ENCRYPTION_KEY`, and independent purpose-specific application secrets. Production preflight verifies public legal pages, readiness including `encryptionSchema: v1`, identity and managed Drive OAuth scopes, offline access, PKCE and the exact callback.

Production database/credentials/deployed provider verification are still pending. Do not treat CI as proof of a live Google round trip.

## Completed in code

- Responsive logical filesystem and core file/account flows.
- Managed Google OAuth plus optional Full Drive indexing code.
- Provider registry and provider-aware transfer foundation.
- Google whole-file-only placement with Auto/manual destination selection.
- Mandatory encryption v1 for all new Meshly-managed files.
- Public multicloud/encryption landing + demo story.
- Public `/privacy` and `/terms` pages.
- Production testing/deployment/security docs aligned to encrypted whole-file Google placement.
- Durable verified + active-work checkpoint layers.
- Strict production environment validation:
  - exact canonical Base64 `TOKEN_ENCRYPTION_KEY` decoding to exactly 32 bytes;
  - HTTPS required outside localhost;
  - `GOOGLE_REDIRECT_URI` must exactly equal `NEXT_PUBLIC_APP_URL + /api/auth/google/callback`;
  - session/encryption/recovery/share/cron secrets must be independent.
- Environment validation tests covering valid configuration and hardened failure cases.
- Production preflight now verifies:
  - `/privacy` and `/terms` availability;
  - health/readiness;
  - readiness `encryptionSchema: v1`;
  - OpenID identity scopes;
  - `drive.file` + `drive.appdata` managed scopes;
  - no unexpected full Drive scope in default flow;
  - `access_type=offline`;
  - PKCE S256;
  - exact deployed OAuth callback;
  - maintenance authentication and cross-origin mutation protection.

## Verification already completed

GitHub Actions run `36269498896` for commit `bb079892b05cec46c1ac95dcb22fa4c6e01e8ab5` passed:

- frozen dependency install: **PASS**
- checkpoint validation: **PASS**
- production dependency security audit: **PASS**
- ESLint: **PASS**
- strict TypeScript: **PASS**
- Vitest: **PASS**
- optimized Next.js production build: **PASS**

This is code/CI verification only.

## Encryption trust model

Do **not** call the current design zero-knowledge or provider-only E2EE. The authenticated planning/download paths participate in file-key handling. Cloud providers receive ciphertext for new managed files, but the Meshly backend is trusted by the current design.

## NOT yet proven with real production credentials

- Hosted TLS PostgreSQL + all migrations through `0005`.
- Complete production environment variables satisfying hardened validation.
- Deployed `/privacy` and `/terms` on the final production origin.
- Deployed preflight/readiness with encryption schema.
- Real Google OAuth callback.
- Real encrypted managed upload and opaque provider-object inspection.
- Download/decrypt SHA-256 equality with source.
- Auto/manual Google destination round trips.
- Interrupted/resumed encrypted upload.
- Real integrity, recovery/decrypt, sharing and cron tests.
- Desktop/mobile deployed smoke test.
- Full Drive sync if broader mode is enabled.

## Next actions — do these in order

1. Provision/configure production TLS PostgreSQL and run migrations through `0005_managed_file_encryption.sql`.
2. Configure production application/OAuth secrets using external secret storage only and satisfy the hardened env validator.
3. Deploy the candidate and verify `/privacy`, `/terms`, `/api/health` and `/api/readiness`.
4. Run `pnpm production:preflight https://meshly.cassielae.me --report=.meshly/preflight-report.json` (or the actual final production origin).
5. Run the required real encrypted Google Auto/manual upload/download tests and inspect the opaque ciphertext object.
6. Test encrypted resume, integrity, recovery, sharing, cron and desktop/mobile smoke flows.
7. Run release verification and checkpoint `production_verified` only after all required live tests genuinely pass.
8. Continue provider adapters (TeraBox, Dropbox, MEGA) only after the production Google path is proven.

## Invariants

- Every new Meshly-managed file uses encryption v1.
- Google managed files stay whole in one Google account.
- Purpose-specific production secrets are independent.
- Never place production secrets in repository/checkpoint files/issues/screenshots/chat.
- Do not claim production encryption verification before a real provider round trip succeeds.
- Current encryption is backend-trusted, not zero-knowledge.
- Provider limits and terms must be respected.
- Repository state newer than this checkpoint wins.

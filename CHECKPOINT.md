# Meshly — canonical continuation checkpoint

> **READ THIS BEFORE CONTINUING.** Also read `AGENTS.md`, `HANDOFF.md`, `NEXT_ACTION.md`, `.meshly/project-state.json`, `.meshly/current-task.json`, `.meshly/resume-state.json`, and the newest file under `docs/checkpoints/`. Newer repository commits and live deployment state always win over this document.

**Checkpoint date:** 2026-09-27  
**Repository:** `cassielxyz/Meshly`  
**Branch:** `main`  
**Latest verified runtime commit:** `8c748046577739f679eebc9863139c6d983cadda`  
**Latest verified CI run:** `36285454881`  
**Verified production deployment:** `dpl_Hf3g7pzhCto1LspvNFQU9ppCH7zZ`  
**Latest milestone record:** `docs/checkpoints/2026-09-27-production-readiness-green.md`

## Current state

Meshly is deployed at `https://meshly.cassielae.me` with the production environment, PostgreSQL connectivity and schema migrations verified live.

`/api/readiness` now returns HTTP 200 with `environment: true`, `database: true`, `migrations: true`, and `encryptionSchema: "v1"`.

The production migration path is autonomous: Vercel production builds run the checksum-verified transactional migration runner before the Next.js build, while preview/local/CI builds do not mutate the production database.

The migration blocker was diagnosed without exposing `DATABASE_URL`: a rollback-only preview probe proved PostgreSQL `42601` at the unquoted `offset` column in `0001_meshly.sql`. The column is now quoted as `"offset"`; the subsequent production deployment completed successfully and migrations through `0005` are live.

The next phase is authenticated Google/provider verification. Do **not** call Meshly `production_verified` yet because a real Google OAuth callback and encrypted upload/download round trip have not been proven.

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
- Strict production environment validation for HTTPS, exact callback, canonical 32-byte Base64 encryption key and independent application secrets.
- Hardened production preflight checks for legal pages, readiness, managed OAuth scopes, offline access and PKCE S256.
- Production-only Vercel migration-before-build wrapper.
- Production migration runner uses TLS and disabled prepared statements to match runtime PostgreSQL behavior.
- Initial PostgreSQL migration quotes the reserved `offset` chunk column.

## Verification already completed

GitHub Actions run `36285454881` for main commit `8c748046577739f679eebc9863139c6d983cadda` passed the repository verification gate.

Live production verification on deployment `dpl_Hf3g7pzhCto1LspvNFQU9ppCH7zZ` confirmed:

- production deployment: **READY**;
- `/api/health`: HTTP 200, OAuth configured and database configured;
- `/api/readiness`: HTTP 200, environment/database/migrations all true, encryption schema v1;
- production migrations through `0005_managed_file_encryption.sql`: **applied/verified by readiness schema checks**;
- managed Google OAuth start: OpenID identity scopes + `drive.file` + `drive.appdata`, offline access, PKCE S256 and exact production callback;
- production security headers present;
- no grouped runtime errors in the inspected five-minute window after the successful deployment.

The rollback-only diagnostic used to find the migration bug left no test table behind and was never merged into production.

## Encryption trust model

Do **not** call the current design zero-knowledge or provider-only E2EE. The authenticated planning/download paths participate in file-key handling. Cloud providers receive ciphertext for new managed files, but the Meshly backend is trusted by the current design.

## NOT yet proven with real production credentials

- successful user-completed Google OAuth callback/session;
- real encrypted managed upload with opaque provider object inspection;
- download/decrypt SHA-256 equality with the source file;
- Auto-selected Google-account round trip;
- explicitly selected Google-account round trip;
- interrupted/resumed encrypted upload;
- real integrity scan;
- recovery snapshot + restore + decrypt rehearsal;
- real encrypted sharing controls;
- authenticated maintenance/cron behavior in the live environment;
- desktop/mobile authenticated smoke test;
- Full Drive sync if broader mode is enabled.

## Next actions — do these in order

1. Complete one real Google sign-in through `https://meshly.cassielae.me` and confirm the callback reaches the Meshly workspace.
2. Upload a small deterministic test file using **Auto choose**, download it, and compare plaintext SHA-256.
3. Inspect the corresponding Google object and confirm opaque managed naming/ciphertext rather than original plaintext content/name.
4. Repeat the round trip with an explicitly selected healthy Google account.
5. Test encrypted resume, integrity, recovery/decrypt, sharing, cron and desktop/mobile authenticated flows.
6. Run release verification and checkpoint `production_verified` only after all required live tests genuinely pass.
7. Continue TeraBox/Dropbox/MEGA adapters only after the Google production path is proven.

## Invariants

- Every new Meshly-managed file uses encryption v1.
- Google managed files stay whole in one Google account.
- Production migrations are transactional, checksum-verified and production-only during Vercel builds.
- Preview/local/CI builds do not mutate the production database.
- Purpose-specific production secrets are independent.
- Never place production secrets in repository/checkpoint files/issues/screenshots/chat.
- Do not claim production encryption verification before a real provider round trip succeeds.
- Current encryption is backend-trusted, not zero-knowledge.
- Provider limits and terms must be respected.
- Repository/deployment state newer than this checkpoint wins.

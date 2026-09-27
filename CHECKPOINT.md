# Meshly — canonical continuation checkpoint

> **READ THIS BEFORE CONTINUING.** Also read `AGENTS.md`, `HANDOFF.md`, `NEXT_ACTION.md`, `.meshly/project-state.json`, `.meshly/current-task.json`, `.meshly/resume-state.json`, and the newest file under `docs/checkpoints/`. Newer repository commits and live deployment state always win over this document.

**Checkpoint date:** 2026-09-27  
**Repository:** `cassielxyz/Meshly`  
**Branch:** `main`  
**Latest verified runtime commit:** `46451951236f0e49132908dd35c471cdefdc3533`  
**Latest verified CI run:** `36318726309`  
**Verified production deployment:** `dpl_3HheJK8KK8ifoGEJfsgjBChoY5hj`  
**Latest milestone record:** `docs/checkpoints/2026-09-27-provider-correctness-foundation.md`

## Current state

Meshly is deployed at `https://meshly.cassielae.me`. Production readiness is HTTP 200 with environment, PostgreSQL connectivity, migrations, managed encryption schema v1, and provider-account schema v1 verified live.

A real authenticated production review exposed three correctness gaps: pre-existing Google Drive files were not visible under the narrow managed scope, Google quota values could remain cached, and Other Clouds was still mostly presentation-only. Main commit `46451951236f0e49132908dd35c471cdefdc3533` addresses those gaps at the provider-connection/indexing layer.

Google account/storage endpoints now refresh stale quota data from Google. Each connected account has a targeted **Show existing files** upgrade path. That path requests read-only access to the user's existing Drive while retaining `drive.file` for Meshly-created/app-selected writes, then redirects back with an account-specific initial sync request.

Other Clouds now has a provider-account schema plus real official-API connection/quota/browse foundations for Dropbox and TeraBox. MEGA remains deliberately unavailable until an official-SDK-backed worker exists. Non-Google encrypted managed upload/download is **not yet claimed complete**; connection/browsing is separated from transfer activation.

Do **not** call Meshly `production_verified` yet. The new Google Full Drive indexing path still requires user consent and live verification, and Dropbox/TeraBox require provider application credentials plus live encrypted transfer tests before their upload paths may be activated.

## Completed in code

- Responsive logical filesystem and core file/account flows.
- Managed Google OAuth plus optional Full Drive indexing code.
- Google Full Drive upgrade narrowed to `drive.readonly` + `drive.file` + `drive.appdata` rather than broad read/write Drive scope.
- Targeted account upgrade using `accountId`, login hint and account-bound OAuth callback checks.
- Automatic initial full index after successful Full Drive upgrade redirect.
- Per-account Google quota refresh with stale-data refresh policy and live refresh controls.
- Google whole-file-only placement with Auto/manual destination selection.
- Mandatory encryption v1 for all new Meshly-managed files.
- Generic encrypted provider-account credential storage (`provider_accounts`) with migration `0006_provider_accounts.sql`.
- Dropbox OAuth/token refresh, account info, quota and existing-file browsing foundation using official provider APIs.
- TeraBox Open Platform authorization/token refresh, token info, quota and app-space browsing foundation using official provider APIs.
- Other Clouds UI now reflects actual provider configuration/connection state instead of static placeholders.
- MEGA is explicitly held behind an official SDK worker rather than a fabricated REST adapter.
- Provider registry and provider-aware transfer policy foundation.
- Public multicloud/encryption landing + demo story.
- Public `/privacy` and `/terms` pages.
- Durable verified + active-work checkpoint layers.
- Strict production environment validation and production-only checksum-verified migration-before-build flow.

## Verification already completed

GitHub Actions run `36318726309` for main commit `46451951236f0e49132908dd35c471cdefdc3533` passed the repository verification gate: frozen install, checkpoint validation, production dependency audit, lint, strict TypeScript, tests and production build.

Live production verification on deployment `dpl_3HheJK8KK8ifoGEJfsgjBChoY5hj` confirmed:

- production deployment: **READY**;
- `/api/readiness`: HTTP 200;
- `environment: true`;
- `database: true`;
- `migrations: true`;
- `encryptionSchema: "v1"`;
- `providerSchema: "v1"`;
- migration `0006_provider_accounts.sql` is therefore present enough for readiness schema checks;
- production CSP now permits only the official TeraBox authorization frame in addition to existing policy sources.

Previous production verification also confirmed managed Google OAuth start, exact callback, offline access, PKCE S256, security headers and migrations through `0005` before the provider schema milestone.

## Encryption trust model

Do **not** call the current design zero-knowledge or provider-only E2EE. The authenticated planning/download paths participate in file-key handling. Cloud providers receive ciphertext for new managed files, but the Meshly backend is trusted by the current design.

## NOT yet proven with real production credentials

- successful Full Drive upgrade/consent for the user's already-connected Google account;
- successful initial index showing pre-existing Google Drive files in the unified workspace;
- user-visible confirmation that refreshed per-account Google quota values match the provider account;
- real encrypted Google managed upload with opaque provider object inspection;
- download/decrypt SHA-256 equality with the source file;
- Auto-selected and explicitly selected Google-account round trips;
- Dropbox production app credentials, live OAuth callback, live quota/listing and encrypted managed transfer;
- TeraBox production Open Platform credentials, live authorization, live quota/listing and encrypted managed transfer;
- MEGA official-SDK worker integration;
- interrupted/resumed encrypted upload, integrity scan, recovery/decrypt, sharing and cron behavior;
- desktop/mobile authenticated smoke tests.

## Next actions — do these in order

1. In the authenticated production workspace, open **Accounts** and use **Show existing files** for the connected Google account. Complete the Google consent flow without sharing credentials/codes/tokens in chat.
2. Confirm the account returns to Meshly and the initial index lists the user's pre-existing Drive files. Verify per-account quota/used/free values after **Refresh live data**.
3. Run the deterministic encrypted Google Auto-account upload/download SHA-256 round trip, inspect the opaque remote object, then repeat with an explicitly selected Google account.
4. Configure Dropbox/TeraBox provider application credentials outside chat/repository, then live-test their official auth/quota/browse foundations.
5. Implement and verify provider-specific encrypted managed upload/download/resume/integrity before marking any non-Google provider as upload-active.
6. Add an official-SDK-backed MEGA worker before enabling MEGA.
7. Run release verification and checkpoint `production_verified` only after all required provider round trips genuinely pass.

## Invariants

- Every new Meshly-managed file uses encryption v1.
- Google managed files stay whole in one Google account.
- Pre-existing Google files are indexed only after explicit broader read consent.
- Production migrations are transactional, checksum-verified and production-only during Vercel builds.
- Preview/local/CI builds do not mutate the production database.
- Purpose-specific production secrets are independent.
- Never place production secrets, provider tokens, OAuth codes or plaintext file keys in repository/checkpoint files/issues/screenshots/chat.
- Provider connection/browsing must not be presented as encrypted-upload support until transfer tests pass.
- Current encryption is backend-trusted, not zero-knowledge.
- Provider limits, supported APIs/SDKs and terms must be respected.
- Repository/deployment state newer than this checkpoint wins.

# 2026-09-27 — Provider correctness foundation deployed

## Why this milestone exists

Authenticated production use exposed three gaps that were not visible in unauthenticated readiness checks:

1. Files that already existed in a connected Google Drive were not listed under normal managed OAuth.
2. Per-account Google storage figures could remain stale because cached database quota values were reused.
3. Other Clouds still presented provider concepts without real connection/quota/browse implementations.

## What changed

Main commit `46451951236f0e49132908dd35c471cdefdc3533` fixes the foundation for those issues:

- Google account quota is refreshed from Drive About when stale and can be explicitly refreshed from the Accounts page.
- Existing Google files use an explicit account-targeted Full Drive upgrade path.
- The broader Google mode requests `drive.readonly` for existing-file reads while retaining `drive.file` for app-scoped writes and `drive.appdata` for app data.
- A successful Full Drive callback redirects to an account-specific initial index.
- `provider_accounts` and migration `0006_provider_accounts.sql` provide encrypted credential storage and quota/status metadata for non-Google providers.
- Dropbox has official OAuth/token refresh, account quota and existing-file browsing foundations.
- TeraBox has official Open Platform authorization/token refresh, token-info, quota and app-space browsing foundations.
- Other Clouds renders actual provider configuration and connected accounts instead of static placeholder cards.
- MEGA remains disabled pending an official-SDK-backed worker.
- Non-Google encrypted managed transfers stay behind an activation gate; connection/browsing is not represented as completed upload support.

## Verification

PR #11 passed GitHub Actions before merge. Main CI run `36318726309` passed frozen install, checkpoint validation, production dependency audit, lint, strict TypeScript, tests and production build.

Production deployment `dpl_3HheJK8KK8ifoGEJfsgjBChoY5hj` is READY for main commit `46451951236f0e49132908dd35c471cdefdc3533`.

Live `GET /api/readiness` returned HTTP 200 with:

- `environment: true`
- `database: true`
- `migrations: true`
- `encryptionSchema: "v1"`
- `providerSchema: "v1"`

This verifies the provider-account schema migration is deployed and the application passes its structural readiness checks.

## What this milestone does NOT prove

It does not prove that the user's broader Google consent has completed, that pre-existing Google files have actually appeared in the user's live workspace, or that refreshed quota values have been visually compared against the provider account.

It also does not prove live Dropbox/TeraBox OAuth because provider application credentials are not yet configured, and it does not prove encrypted managed upload/download for any non-Google provider. Those remain explicit next phases.

Meshly is therefore **not** `production_verified` yet.

## Next verification

Use **Show existing files** on the exact connected Google account, complete consent, verify the automatic initial index and live quota values, then run the encrypted Google Auto/manual round-trip tests. After that, configure Dropbox/TeraBox provider application credentials outside chat and test their real provider flows before implementing/activating encrypted transfers.

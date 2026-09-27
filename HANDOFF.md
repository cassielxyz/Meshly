# Meshly active handoff

> Read this after `AGENTS.md`. It records work that may be newer than the canonical milestone in `CHECKPOINT.md`.

**Updated:** 2026-09-27  
**Repository:** `cassielxyz/Meshly`  
**Active branch:** `main`  
**Active PR:** none  
**Current main:** `46451951236f0e49132908dd35c471cdefdc3533`  
**Verified CI:** `36318726309`  
**Verified production deployment:** `dpl_3HheJK8KK8ifoGEJfsgjBChoY5hj`

## Active task

Verify the production fixes for user-reported provider correctness gaps: pre-existing Google files, per-account Google quota accuracy, and real Other Clouds connection/browse behavior. Continue without storing credentials, OAuth codes, provider tokens or plaintext file keys in Git or chat.

## Production state already verified

Live on `https://meshly.cassielae.me`:

- deployment `dpl_3HheJK8KK8ifoGEJfsgjBChoY5hj` is READY at main commit `46451951236f0e49132908dd35c471cdefdc3533`;
- main CI run `36318726309` passed install/checkpoint/audit/lint/typecheck/test/build;
- `/api/readiness` is HTTP 200 with environment/database/migrations true;
- `encryptionSchema: "v1"` and `providerSchema: "v1"` are live;
- provider account migration `0006_provider_accounts.sql` is deployed;
- Google account/storage routes now refresh stale quota data from Google;
- Accounts UI has account-targeted **Show existing files** and Full Drive sync controls;
- Full Drive OAuth requests read-only access to all existing Drive files plus app-scoped `drive.file` writes and appdata;
- successful Full Drive callback now redirects into an account-specific initial index;
- Other Clouds now contains real Dropbox/TeraBox official-API auth/quota/browse foundations instead of static placeholders;
- MEGA remains explicitly disabled pending an official SDK worker;
- non-Google encrypted managed upload/download remains behind the provider activation gate and is not claimed complete.

## Exact next action

The next verification step requires the authenticated user's browser:

1. Open `https://meshly.cassielae.me/accounts` while signed in.
2. On the affected Google account, choose **Show existing files**.
3. Complete Google's consent flow. Do not share password, OAuth code, cookie, access token or refresh token.
4. On return to Meshly, allow the initial index to complete and confirm whether the older Drive files appear.
5. Use **Refresh live data** and compare quota/used/free with that exact Google account.
6. Continue with the deterministic encrypted Google upload/download SHA-256 round trip.

After Google correctness is proven, configure Dropbox/TeraBox application credentials outside chat and verify live auth/quota/browse. Then implement and live-test their encrypted managed transfer paths before marking them upload-active.

## Invariants

- Never request or store production secrets, provider credentials, Google passwords, OAuth codes, cookies or tokens in chat/repository files.
- New Meshly-managed files remain encrypted before provider storage.
- Google managed files remain whole-file-only in one Google account.
- Existing Google files require explicit broader read consent; do not silently broaden normal managed sign-in.
- Provider connection/browsing does not equal encrypted-upload support.
- Current encryption is backend-trusted, not zero-knowledge.
- Production migrations are idempotent/checksum-verified and run only on Vercel production builds.
- Preview/local/CI builds must not mutate production database state.
- Repository/deployment state newer than this handoff wins.

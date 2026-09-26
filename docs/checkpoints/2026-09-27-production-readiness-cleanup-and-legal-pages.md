# 2026-09-27 — Production-readiness cleanup and public legal pages

## Milestone

Meshly’s documentation, public legal surface and production verification plan now match the current encrypted multi-cloud architecture and Google whole-file placement invariant.

## Implemented

- README current status and roadmap updated after the Google destination/public-story milestones.
- Removed obsolete production guidance that required one Google managed file to span accounts.
- Production integration tests now verify:
  - encrypted small-file round trip;
  - Auto-chosen Google destination round trip;
  - explicitly selected Google destination round trip;
  - opaque ciphertext provider object inspection;
  - interrupted/resumed encrypted upload;
  - integrity, recovery/decrypt, sharing, cron and desktop/mobile smoke tests.
- Deployment guide now requires migrations through `0005_managed_file_encryption.sql`, public legal URLs and current encrypted Google tests.
- Integration-results template upgraded to the current required live-test IDs.
- Security policy documents managed-file encryption, backend trust boundary, secret handling and whole-file Google invariants.
- Added public `/privacy` page describing account/storage data, Google-authorized data, encrypted managed files and the non-zero-knowledge trust boundary.
- Added public `/terms` page covering authorized storage use, provider rules, whole-file Google behavior, sharing, prohibited abuse and service availability.
- Added shared legal-page layout and Privacy/Terms links in the public footer.
- Updated root metadata from Google-only wording to multi-cloud encrypted storage.
- Replaced the stale documentation SVG that showed a Google file split into parts across accounts with logical file → Encrypt v1 → provider policy → one Google destination / Other Clouds.
- Refreshed README banner badges to **MULTI-CLOUD** and **ENCRYPTED FILES**.

## Verification

Runtime/task commit: `71e164814de83d858d744d987b54443ef0019f95`  
GitHub Actions run: `36268994840`

Passed:

- frozen pnpm install;
- checkpoint validation;
- production dependency security audit;
- ESLint;
- strict TypeScript;
- Vitest;
- optimized Next.js production build.

This is code/CI verification only. It does not prove production PostgreSQL, deployed legal URLs, Google OAuth, real ciphertext provider objects, or encrypted upload/download round trips.

## Next

1. Merge PR #5 after the checkpoint-only CI is green.
2. Provision/configure production TLS PostgreSQL and run migrations through `0005`.
3. Configure production OAuth/application environment values using the intended secret manager/environment; do not place secrets in repository/checkpoints/chat.
4. Deploy the candidate and verify `/privacy`, `/terms`, health/readiness and automated preflight.
5. Complete all required real encrypted Google Auto/manual placement and production integration tests.
6. Only after those pass, checkpoint `production_verified` and proceed with release/provider expansion.

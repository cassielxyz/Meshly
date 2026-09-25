# Meshly checkpoint — production preflight tooling complete

**Date:** 2026-09-26  
**Verified runtime/ops commit:** `92549c6dd709f1b94849efb34c1bf4ffc65cd7de`

## Milestone completed

Meshly was already production-code complete and waiting for real credentials. This continuation added the deployment-verification layer needed for the credential phase without restarting completed product work.

Completed in this milestone:

- `/api/readiness` now distinguishes environment configuration, database connectivity and required migrated schema. It probes migrations 0001-0004 read-only and refuses readiness when required tables/columns are absent.
- `pnpm production:preflight https://DEPLOYED_ORIGIN` checks landing availability, security headers, health, readiness/migrations, Google OAuth redirect + PKCE S256, cron authentication protection and the cross-origin unsafe-mutation guard.
- `PRODUCTION_TESTING.md` defines the required real-user verification matrix, including two-account quota pooling, small-file hash round trip, forced cross-account reconstruction hash match, resumable upload, integrity, recovery, sharing, cron and desktop/mobile smoke tests.
- `docs/integration-results.template.json` provides a non-secret evidence shape.
- `.meshly/preflight-report.json` and `.meshly/integration-results.json` are gitignored.
- `pnpm release:check` blocks release readiness unless automated preflight and all required credential-dependent tests are recorded as passing.
- `DEPLOYMENT.md` now routes deployment through the automated preflight and the explicit real integration matrix.

## Verification

GitHub Actions run `36185650013` for commit `92549c6...` passed:

- checkpoint validation: PASS
- ESLint: PASS
- strict TypeScript: PASS
- Vitest: PASS
- optimized Next.js production build: PASS

## Still pending

No real production credentials were available during this milestone, so the following remain integration work rather than code work:

- hosted TLS PostgreSQL + production migrations;
- real Google OAuth and multiple real accounts;
- real upload/download/reconstruction tests;
- real integrity/recovery/share/cron tests;
- deployed desktop/mobile smoke tests;
- optional Full Drive verification when broader OAuth scope is approved/eligible.

The next agent must continue from credential provisioning/deployment. Do not rebuild the product or the preflight tooling unless a real test exposes a defect.

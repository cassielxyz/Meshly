# Meshly checkpoint — reproducible security gate complete

**Date:** 2026-09-26  
**Verified runtime/CI commit:** `731473cb627d85c370f337285e98a33b1cccbef7`  
**Verification workflow:** GitHub Actions run `36186865942`

## Milestone completed

This continuation hardened the already-complete Meshly production codebase before credentialed deployment.

Completed in this milestone:

- Added and committed `pnpm-lock.yaml` so dependency resolution is deterministic.
- CI now installs with `pnpm install --frozen-lockfile`.
- CI and `pnpm verify` now run `pnpm audit --prod --audit-level high`.
- The new audit exposed high-severity advisory `GHSA-gpj5-g38j-94v9` in `drizzle-orm < 0.45.2`.
- Upgraded `drizzle-orm` from the vulnerable 0.44.x line to stable `0.45.3` and regenerated the lockfile.
- Re-ran the production dependency audit successfully after the upgrade.
- Upgraded GitHub workflow actions from deprecated Node-20-based releases to:
  - `actions/checkout@v7.0.1`
  - `pnpm/action-setup@v6.1.0`
  - `actions/setup-node@v7.0.0`
- Added weekly Dependabot monitoring for npm dependencies and GitHub Actions.
- Updated deployment documentation so the frozen lockfile and production audit are release invariants.

## Verification

GitHub Actions run `36186865942` for commit `731473cb...` passed:

- modern GitHub Actions setup: PASS
- frozen `pnpm-lock.yaml` install: PASS
- checkpoint validation: PASS
- production dependency security audit: PASS
- ESLint: PASS
- strict TypeScript: PASS
- Vitest: PASS
- optimized Next.js production build: PASS

## Current boundary

No production credentials were available to this repository workflow. The next phase remains credentialed infrastructure and real integration verification:

1. provision TLS PostgreSQL;
2. configure production environment variables;
3. run production migrations;
4. deploy to Vercel/Node 22+;
5. run `pnpm production:preflight` against the deployed origin;
6. complete `PRODUCTION_TESTING.md` with real Google accounts;
7. run `pnpm release:check` and `pnpm verify`;
8. only then mark Meshly `production_verified` and tag the release.

Do not remove the lockfile, downgrade Drizzle below the patched line, disable the audit gate, or return CI to non-frozen installs.

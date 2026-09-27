# Meshly active handoff

> Read this after `AGENTS.md`. It records work that may be newer than the canonical milestone in `CHECKPOINT.md`.

**Updated:** 2026-09-28  
**Repository:** `cassielxyz/Meshly`  
**Active branch:** `work/post-pr14-deploy-blocker`  
**Merged functional PR:** `#14` — `feat: add activation-gated encrypted TeraBox transfers`  
**Current main:** `a74596ae8a12c4c9025914112807162e9af17cce`  
**PR #14 verified CI:** `36344842001` at head `528ed99e9f519005e6ed2b3e25c907d921edd417`  
**Last verified production code:** `9018491a83d9663dc09b32c9889c3133cac15e01`  
**Last verified production deployment:** `dpl_4yceJJbueyJS978P2sviWdPkQ2By`

## Active task

PR #14 is merged and its exact head passed the full Meshly CI gate. Production deployment is currently blocked externally because Vercel reported `Deployment rate limited — retry in 24 hours` for main commit `a74596ae8a12c4c9025914112807162e9af17cce`.

Do not falsely advance the canonical production runtime checkpoint. Production is still serving the previous verified main runtime until a new production deployment succeeds.

## Merged and CI-verified in PR #14 — NOT yet production-deployed

- migration `0008_google_quota_breakdown.sql` persists total Google usage, Drive usage and Drive-trash usage separately;
- Google quota refresh/API reporting no longer labels total Google Account usage as Drive-only usage;
- `/accounts` routes to the live Google account view with **Refresh live data** and targeted **Show existing files**;
- official TeraBox provider-domain transfer primitives and app-space managed paths;
- explicit `TERABOX_MANAGED_UPLOADS_ENABLED` safety gate, default off;
- encrypted TeraBox small-file planning/upload/remote verification/download/decrypt/abort/delete using Meshly encryption v1 and opaque `msh_*.bin` names;
- retry-safe TeraBox precreate handling and remote size/available-MD5 verification before logical readiness;
- Other Clouds includes encrypted Dropbox/TeraBox upload controls only when the corresponding provider safety gate is enabled;
- Vitest alias configuration and TeraBox managed-transfer policy tests.

PR #14 head `528ed99e9f519005e6ed2b3e25c907d921edd417` passed CI run `36344842001`: frozen install, checkpoint validation, production dependency audit, lint, strict TypeScript, tests and production build. No unresolved review threads were present before merge.

## Verified production baseline

Production deployment `dpl_4yceJJbueyJS978P2sviWdPkQ2By` for main commit `9018491a83d9663dc09b32c9889c3133cac15e01` remains the last verified runtime. Live readiness was HTTP 200 with environment/database/migrations true, `encryptionSchema: "v1"` and `providerSchema: "v2"`.

## Current external blocker

GitHub/Vercel status for merged main commit `a74596ae8a12c4c9025914112807162e9af17cce` reports: **Deployment rate limited — retry in 24 hours.** No new production deployment exists for that commit yet, so migration `0008` and `googleQuotaSchema: "v2"` are not live-verified.

Do not attempt to bypass the hosting rate limit or claim production deployment success from preview builds.

## Still not verified / not active

- production deployment of merged PR #14 and migration `0008`;
- live readiness with `googleQuotaSchema: "v2"`;
- user-completed Google existing-file read consent/indexing and exact quota comparison;
- real Google encrypted Auto/selected-account round trips;
- real Dropbox encrypted provider transfer verification; Dropbox gate remains off;
- real TeraBox auth/quota/browse + encrypted transfer verification; TeraBox gate remains off;
- TeraBox large-file worker;
- MEGA official-SDK worker;
- final integrity/recovery/share/cron/mobile-desktop production verification.

## Exact next action

1. When the Vercel build-rate window clears, retry/redeploy main commit `a74596ae8a12c4c9025914112807162e9af17cce` without changing provider upload gates.
2. Verify the resulting production deployment is READY and `/api/readiness` is HTTP 200 with `googleQuotaSchema: "v2"`, `providerSchema: "v2"`, migrations true and encryption schema v1.
3. Then use the authenticated browser **Show existing files** flow, verify pre-existing Drive files appear, and compare refreshed total/Drive/trash/free values with Google.
4. Run encrypted Google Auto + selected-account SHA-256 round trips.
5. Configure Dropbox/TeraBox application credentials only outside chat/repository and run provider-specific auth/quota/browse/transfer/integrity/delete/recovery tests before enabling either gate.
6. Continue non-secret-safe work on the dedicated TeraBox large-file worker and MEGA SDK worker without treating those as live capabilities.

## Invariants

- Never request/store production secrets, provider credentials, passwords, OAuth codes, cookies or tokens in chat/repository files.
- New Meshly-managed files are encrypted before provider storage.
- No logical managed file becomes `ready` before the remote encrypted object verifies.
- Google managed files remain whole-file-only in one Google account.
- Provider connection/browsing does not equal encrypted upload support.
- Dropbox/TeraBox upload support remains feature-gated until provider-specific live tests pass.
- Current encryption is backend-trusted, not zero-knowledge.
- Repository/deployment state newer than this handoff wins.

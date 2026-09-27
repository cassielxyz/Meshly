# Meshly active handoff

> Read this after `AGENTS.md`. It records work that may be newer than the canonical milestone in `CHECKPOINT.md`.

**Updated:** 2026-09-28  
**Repository:** `cassielxyz/Meshly`  
**Active branch:** `work/terabox-encrypted-transfers`  
**Active PR:** `#14` — `feat: add activation-gated encrypted TeraBox transfers`  
**Base main:** `9018491a83d9663dc09b32c9889c3133cac15e01`  
**Last verified main CI:** `36321037829` on the PR #13 head before merge  
**Verified production deployment before this branch:** `dpl_4yceJJbueyJS978P2sviWdPkQ2By`

## Active task

Finish and verify PR #14: correct per-account Google quota categories and add a real, activation-gated encrypted TeraBox managed small-file path without claiming live provider verification. Keep `TERABOX_MANAGED_UPLOADS_ENABLED=false` until provider-specific live tests pass.

## Implemented on this branch — awaiting exact-head CI/live provider verification

- migration `0008_google_quota_breakdown.sql` persists total Google usage, Drive usage and Drive-trash usage separately;
- Google account refresh pulls quota data from the provider and `/api/storage` exposes the categories without treating total Google Account usage as Drive-only usage;
- `/accounts` routes to the live account view with **Refresh live data**, targeted **Show existing files** and per-account values;
- official TeraBox token/API/upload-domain primitives and app-space managed paths;
- explicit `TERABOX_MANAGED_UPLOADS_ENABLED` safety gate;
- encrypted TeraBox planning with Meshly encryption v1 and opaque `msh_*.bin` names;
- current Vercel/serverless TeraBox path intentionally accepts only small encrypted objects (<= 3 MiB ciphertext / one Meshly frame); large files remain blocked pending a dedicated worker;
- TeraBox precreate/shard/create flow with retry-safe detection of an already-created object;
- remote size + available remote MD5 verification before a logical file becomes `ready`;
- encrypted TeraBox download/decrypt, abort cleanup and permanent delete integration;
- Other Clouds now has a user-facing encrypted-provider upload panel, but controls only appear when the corresponding provider safety gate is enabled;
- unit coverage for the TeraBox managed path/gate/serverless ceiling.

## Verified baseline

Main commit `9018491a83d9663dc09b32c9889c3133cac15e01` is deployed and READY. Live `/api/readiness` is HTTP 200 with environment/database/migrations true, `encryptionSchema: "v1"` and `providerSchema: "v2"`.

PR #13 exact head CI `36321037829` passed install, checkpoint validation, audit, lint, typecheck, tests and build before that merge.

## Still not verified / not active

- PR #14 exact-head CI after the latest TeraBox integrity/UI/checkpoint changes;
- migration `0008` in production and `googleQuotaSchema: "v2"` live readiness;
- user-completed Google existing-file consent/indexing and exact quota comparison;
- real Google encrypted Auto/selected-account round trips;
- real Dropbox encrypted production transfer verification; Dropbox gate remains off;
- real TeraBox auth/quota/browse + encrypted production transfer verification; TeraBox gate remains off;
- TeraBox large-file worker;
- MEGA official-SDK worker;
- final integrity/recovery/share/cron/mobile-desktop production verification.

## Exact next action

1. Wait for/check PR #14 CI at the newest head and fix any failing lint/type/test/build/checkpoint step.
2. Review changed files and keep both non-Google managed-upload gates off.
3. Merge PR #14 only after the exact head is green.
4. Let the production migration runner apply `0008_google_quota_breakdown.sql`; verify production readiness returns HTTP 200 with `googleQuotaSchema: "v2"` and provider schema v2.
5. In the authenticated browser, run **Show existing files**, verify older Drive files appear, then compare total/Drive/trash/free values after **Refresh live data**.
6. Run Google encrypted Auto + selected-account SHA-256 round trips.
7. Only after external provider credentials are configured outside chat, live-test Dropbox/TeraBox auth, quota, browse, encrypted transfer, ciphertext inspection, retry/abort, integrity, delete and recovery before enabling their gates.

## Invariants

- Never request/store production secrets, provider credentials, passwords, OAuth codes, cookies or tokens in chat/repository files.
- New Meshly-managed files are encrypted before provider storage.
- No logical managed file becomes `ready` before the remote encrypted object verifies.
- Google managed files remain whole-file-only in one Google account.
- Provider connection/browsing does not equal encrypted upload support.
- Dropbox/TeraBox upload support remains feature-gated until provider-specific live tests pass.
- Current encryption is backend-trusted, not zero-knowledge.
- Repository/deployment state newer than this handoff wins.

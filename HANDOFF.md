# Meshly active handoff

> Read this after `AGENTS.md`. It records work that may be newer than the canonical milestone in `CHECKPOINT.md`.

**Updated:** 2026-10-02  
**Repository:** `cassielxyz/Meshly`  
**Active branch:** `main`  
**Latest merged functional PR:** `#16` — `feat: complete workspace UX and gated TeraBox large-file worker`  
**Current main / verified production code:** `069878312a9409148dde34fad031b4ff5c7fee6d`  
**PR #16 verified CI:** `36919473571` at exact head `7cf7b84ed7eea07c99b5ed62a0ad59d0c77a529f`  
**Verified production deployment:** `dpl_9uUDaEdaNxXkGDPGtRYUkY2bkGzb`

## Active task

The repository/deployment blockers are cleared. PR #16 is merged, production deployment is READY, and live readiness is HTTP 200 with environment/database/migrations true plus encryption schema v1, provider schema v2 and Google quota schema v2.

The next blocker is **real authenticated provider verification**, not missing code for the previously reported Google quota schema or provider foundation.

For the user's report that pre-existing Google Drive files are not listed, the implemented path is the targeted **Show existing files** upgrade. It requests broader read-only Drive access for that specific account, then runs an initial full index. That consent/index has not yet been proven in the real production browser, so do not claim the user's existing files are fixed until the user completes it and the index is observed.

For the user's report that storage data was inaccurate, the corrected quota-category model is now live. It separates total Google Account usage, Drive usage and Drive-trash usage. Exact values still need comparison against Google for the same account after a live refresh.

Other Clouds now has real Dropbox/TeraBox provider connection, quota and browse foundations plus encrypted transfer foundations. Their managed-upload gates remain off until real provider tests pass. MEGA is still intentionally unavailable pending an official SDK-backed worker.

## Newly verified and deployed

- PR #16 exact head passed frozen install, checkpoint check, production dependency audit, lint, strict TypeScript, tests and production build.
- Core workspace bulk actions, filters, sorting, persistent view/density, richer shares, Downloads and Analytics are deployed.
- TeraBox large-file worker code is deployed behind fail-closed gates.
- TeraBox ciphertext is repacked independently of encryption-frame boundaries into provider-safe transport parts; any multipart layout has every part, including the final part, above 4 MiB.
- Browser, backend token validation and worker validation reject unsafe/inconsistent transport layouts.
- Production `dpl_9uUDaEdaNxXkGDPGtRYUkY2bkGzb` is READY for main `069878312a9409148dde34fad031b4ff5c7fee6d`.
- Live `/api/readiness` is HTTP 200 with `encryptionSchema: "v1"`, `providerSchema: "v2"`, `googleQuotaSchema: "v2"` and migrations true.

## Still not verified / not active

- user-completed Google **Show existing files** consent and successful initial index;
- exact Google quota comparison in the authenticated browser;
- real Google encrypted Auto/selected-account round trips;
- real Dropbox encrypted provider transfer verification; Dropbox gate remains off;
- real TeraBox small-file encrypted provider transfer verification; TeraBox gate remains off;
- separately deployed TeraBox worker plus real multipart encrypted provider round trip; large-worker gate remains off;
- MEGA official-SDK worker;
- final integrity/recovery/share/cron/mobile-desktop production verification.

## Exact next action

1. In production, open the connected Google account and choose **Show existing files**.
2. Complete Google's read-only Drive consent for that same account; do not send OAuth codes/tokens/cookies to chat.
3. Run/observe the initial Drive index and confirm pre-existing files appear in Meshly.
4. Refresh live quota data and compare total/Drive/trash/free values with Google for the same account.
5. Then run encrypted Google Auto + selected-account SHA-256 round trips.
6. After Google is proven, perform Dropbox/TeraBox provider-specific live verification with credentials configured only outside chat/repository before enabling any upload gate.
7. Deploy and verify the dedicated TeraBox worker separately before enabling `TERABOX_LARGE_WORKER_ENABLED`.

## Invariants

- Never request/store production secrets, provider credentials, passwords, OAuth codes, cookies or tokens in chat/repository files.
- New Meshly-managed files are encrypted before provider storage.
- No logical managed file becomes `ready` before the remote encrypted object verifies.
- Google managed files remain whole-file-only in one Google account.
- Provider connection/browsing does not equal encrypted upload support.
- Dropbox/TeraBox upload support remains feature-gated until provider-specific live tests pass.
- TeraBox provider fragment planning is independent from Meshly encryption-frame boundaries and must satisfy provider fragment-size requirements.
- Current encryption is backend-trusted, not zero-knowledge.
- Repository/deployment state newer than this handoff wins.

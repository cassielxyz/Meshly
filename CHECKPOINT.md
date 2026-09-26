# Meshly — canonical continuation checkpoint

> **READ THIS BEFORE CONTINUING.** Also read `AGENTS.md`, `.meshly/project-state.json`, and the newest file under `docs/checkpoints/`. Newer repository commits always win over this document.

**Checkpoint date:** 2026-09-26  
**Repository:** `cassielxyz/Meshly`  
**Branch:** `main`  
**Latest verified runtime/UI commit:** `a283d4d330fe0481a5db035c750085f4ac808e96`  
**Latest verified CI run:** `36252778615`  
**Latest milestone record:** `docs/checkpoints/2026-09-26-android-demo-mobile-refinement.md`

## Current state

Meshly is **production-code complete** and remains in the **credentials + deployment + real integration verification** phase.

Do **not** restart or rebuild completed product work unless deployed testing proves a real issue. Newer repository commits always take precedence over this checkpoint.

## Completed in code

- Unified logical filesystem and multi-account Google Drive storage pool.
- Whole-file-first allocation plus deterministic cross-account splitting when required.
- Incremental SHA-256 hashing, Google resumable uploads, commit verification, multipart reconstruction and HTTP Range support.
- Managed OAuth mode, optional Full Drive indexing, account health/quota refresh and disconnect safeguards.
- Sharing, integrity scanning, signed recovery manifests and restore paths.
- Production security hardening, readiness/health endpoints, maintenance cron, migrations, deployment preflight, release checks and CI.
- Durable AI continuation/checkpoint system.
- Public interactive `/demo` flow with Connect → Plan → Split → Transfer → Reconstruct simulation.
- Bodoni Moda italic `One Meshly workspace.` hero treatment with pink → lavender gradient.
- Hero uses a cleaner white/lavender/pink Android/mobile background instead of the earlier blue/green wash.
- Mobile editorial hero has controlled balanced wrapping, improved line-height and centered two-line composition.
- Real scroll-scrubbed and reversible Live Placement Map.
- Mobile architecture story has a separate intro followed by its own sticky placement-map scroll range, preventing the map from entering already-completed.
- Live Placement Map derives progress from the nearest `data-placement-scroll-root` and uses stable absolute scroll measurements with mobile header offset.
- Placement spring timing is softer/slower and mobile card spacing is tightened for Android viewports.
- Persistent public light/dark mode.
- Compact GitHub source control and cassiel footer/profile credit.
- Public pages use one centered editorial footer signature.
- Global portal/floating header controls were removed.
- Landing, onboarding, login and demo render source/theme controls directly inside their real headers.
- Onboarding `Explore demo workspace` routes to `/demo`.
- Demo stage surfaces now use semantic theme colors so dark-mode text remains readable.
- Demo Step 1 Unified Capacity contrast is fixed in dark mode.
- Demo Step 2 file header/status layout is mobile-safe; the `Planning` badge no longer clips off-screen.
- Demo cards, typography, progress controls and safe-area spacing are tightened for Android.
- Manual demo navigation pauses autoplay so the tour does not unexpectedly advance while the user is interacting.

## Verification already completed

GitHub Actions run `36252778615` for runtime/UI commit `a283d4d330fe0481a5db035c750085f4ac808e96` passed:

- frozen dependency install: **PASS**
- checkpoint validation: **PASS**
- production dependency security audit: **PASS**
- ESLint: **PASS**
- strict TypeScript: **PASS**
- Vitest: **PASS**
- optimized Next.js production build: **PASS**

This is CI verification only; it is **not yet credentialed production integration verification**.

## NOT yet proven with real production credentials

- Hosted TLS PostgreSQL + production migration.
- Production environment variables from `.env.example`.
- Vercel/Node 22+ deployment.
- `pnpm production:preflight` against the deployed URL.
- Real Google OAuth callback.
- Two or more real Google accounts and pooled quota.
- Small-file upload/download SHA-256 round trip.
- Forced cross-account multipart upload/reconstruction SHA-256 round trip.
- Interrupted/resumed upload test.
- Full Drive index/change sync test if broader mode is enabled.
- Real integrity scan.
- Recovery snapshot + restore rehearsal.
- Share password/expiry/download-limit/revocation test.
- Vercel cron authentication test.
- Desktop/mobile deployed visual smoke test including real header placement, Android hero background/typography, dark mode, footer signature, slow reversible placement scroll motion, and all five demo steps in both themes.

## Next actions — do these in order

1. Provision production PostgreSQL with TLS.
2. Configure all required environment variables.
3. Run `pnpm db:migrate` against production.
4. Deploy `main`.
5. Run `pnpm production:preflight https://YOUR_DOMAIN --report=.meshly/preflight-report.json` and require all checks to pass.
6. Execute the required cases in `PRODUCTION_TESTING.md` and store non-secret evidence.
7. Force one file to span at least two Google accounts and compare the downloaded whole-file SHA-256 with the original.
8. Run integrity and recovery rehearsals.
9. Verify sharing and scheduled maintenance.
10. Smoke-test desktop and Android mobile, especially header-contained source/theme controls, hero alignment/background, the placement map visibly progressing through whole → split → verified states, and `/demo` Steps 1–5 in both light and dark mode.
11. Run `pnpm release:check` and `pnpm verify`.
12. Fix only failures found by real testing.
13. When all required integration tests pass, update this checkpoint to **production verified** and create the release/tag.

## External constraint

Keep Managed Google Drive mode as the default public mode. Full Drive mode uses broader access and should only be exposed publicly after the applicable Google OAuth verification/security-review requirements are satisfied.

## Continuation prompt

> Open `cassielxyz/Meshly`. Read `AGENTS.md`, `CHECKPOINT.md`, `.meshly/project-state.json`, and the newest checkpoint under `docs/checkpoints/`. Inspect newer commits and CI, then continue only from unfinished next actions. Do not redo completed work.

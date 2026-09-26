# Meshly — canonical continuation checkpoint

> **READ THIS BEFORE CONTINUING.** Also read `AGENTS.md`, `.meshly/project-state.json`, and the newest file under `docs/checkpoints/`. Newer repository commits always win over this document.

**Checkpoint date:** 2026-09-26  
**Repository:** `cassielxyz/Meshly`  
**Branch:** `main`  
**Latest verified runtime/UI commit:** `a832639fc25facc4e666e26adef7bf7cc89009f2`  
**Latest verified CI run:** `36245925428`  
**Latest milestone record:** `docs/checkpoints/2026-09-26-header-mounted-controls-complete.md`

## Current state

Meshly is **production-code complete** and remains in the **credentials + deployment + real integration verification** phase.

Do **not** restart or rebuild completed product work unless deployed testing proves a real issue. The implementation already includes the unified logical filesystem, multi-account storage pool, cross-account file splitting/reconstruction, resumable Google Drive uploads, recovery/integrity/sharing flows, security hardening, CI, production preflight, interactive demo, dark mode, editorial hero, scroll-scrubbed placement story, footer credit, and durable checkpoint system.

## Latest UI behavior — locked unless a verified issue appears

- `One Meshly workspace.` uses Bodoni Moda italic with the pink → lavender editorial gradient.
- The Live Placement Map is driven by **real scroll progress**, not a time loop.
- Scrolling backward reverses the placement sequence.
- The split animation uses extended scroll distance and softened spring timing for slower, smoother motion.
- Public light/dark mode is persistent.
- GitHub/source and theme controls are compact.
- **GitHub/source and theme controls must live inside the public page header. They must not float fixed over page content.**
- Landing and demo controls mount into their existing header action groups.
- Onboarding and login now have proper headers with Meshly branding on the left and the controls on the right.
- Onboarding `Explore demo workspace` routes to `/demo`.
- Public pages use one centered editorial cassiel footer signature with the GitHub profile link.

## Runtime verification

GitHub Actions run `36245925428` for commit `a832639fc25facc4e666e26adef7bf7cc89009f2` passed:

- frozen dependency install: **PASS**
- checkpoint validation: **PASS**
- production dependency security audit: **PASS**
- ESLint: **PASS**
- strict TypeScript: **PASS**
- Vitest: **PASS**
- optimized Next.js production build: **PASS**

This is CI verification only; it is **not yet credentialed production integration verification**.

## Production integration still pending

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
- Desktop/mobile deployed visual smoke test including header-mounted controls, dark mode, footer signature, editorial hero and slow reversible scroll placement motion.

## Next actions — in order

1. Provision production PostgreSQL with TLS.
2. Configure all required environment variables.
3. Run `pnpm db:migrate` against production.
4. Deploy `main`.
5. Run `pnpm production:preflight https://YOUR_DOMAIN --report=.meshly/preflight-report.json` and require all checks to pass.
6. Execute the required cases in `PRODUCTION_TESTING.md` and store non-secret evidence.
7. Force one file to span at least two Google accounts and compare the downloaded whole-file SHA-256 with the original.
8. Run integrity and recovery rehearsals.
9. Verify sharing and scheduled maintenance.
10. Smoke-test desktop and mobile, especially header-mounted source/theme controls and the scroll placement timing.
11. Run `pnpm release:check` and `pnpm verify`.
12. Fix only failures found by real testing.
13. When all required integration tests pass, update this checkpoint to **production verified** and create the release/tag.

## External constraint

Keep Managed Google Drive mode as the default public mode. Full Drive mode uses broader access and should only be exposed publicly after the applicable Google OAuth verification/security-review requirements are satisfied.

## Continuation prompt

> Open `cassielxyz/Meshly`. Read `AGENTS.md`, `CHECKPOINT.md`, `.meshly/project-state.json`, and the newest checkpoint under `docs/checkpoints/`. Inspect newer commits and CI, then continue only from unfinished next actions. Do not redo completed work.

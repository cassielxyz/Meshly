# Checkpoint — Public controls mounted inside headers

**Date:** 2026-09-26  
**Verified runtime/UI commit:** `a832639fc25facc4e666e26adef7bf7cc89009f2`  
**GitHub Actions run:** `36245925428`

## Completed

- Removed the global fixed/floating GitHub + theme controls that could hover over page content on mobile.
- Public controls now mount into each public page header action area.
- Existing landing and demo headers receive the compact GitHub source icon + theme toggle inside their right-side action cluster.
- `/onboarding` now has a proper header with Meshly branding on the left and public controls on the right.
- `/login` now has a proper header with Meshly branding on the left and public controls on the right.
- Onboarding `Explore demo workspace` now routes to the real public `/demo` page instead of `/drive`.
- Footer credit remains unchanged from the prior verified refinement.

## Verification

GitHub Actions run `36245925428` passed:

- frozen install
- checkpoint validation
- production dependency audit
- ESLint
- strict TypeScript
- Vitest
- optimized Next.js production build

## Invariant

Public GitHub/source and theme controls must live inside public headers. Do not reintroduce fixed viewport-floating controls unless a verified product requirement explicitly calls for it.

## Next phase

Continue with production credentials, database migration, deployment preflight, and real Google Drive integration testing. Do not rebuild completed UI work without a verified issue.

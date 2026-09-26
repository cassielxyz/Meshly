# Checkpoint — Android/mobile hero + scroll fix

**Date:** 2026-09-26  
**Verified runtime commit:** `bbdbc60fcab4e8bbcb73501376c35a6bd22c785d`  
**Verified CI run:** `36252129110`

## Completed

- Removed portal/floating public controls from the global chrome.
- Landing, onboarding and login now render GitHub/source + theme controls directly inside real page headers.
- Mobile header controls were reduced to compact 32 px controls so they fit alongside the Meshly logo and primary CTA.
- Rebuilt the landing hero background for Android/mobile with a cleaner white/lavender/pink surface instead of the previous blue/green wash.
- `One Meshly workspace.` keeps Bodoni Moda italic styling but now uses a controlled balanced mobile width, improved line-height, spacing and centered two-line composition.
- Reworked the architecture section so mobile has a normal story intro followed by a dedicated sticky placement-map scroll range.
- The Live Placement Map now reads progress from the closest `data-placement-scroll-root` rather than the entire architecture section.
- Mobile scroll progress uses stable absolute scroll measurements and a dedicated header offset, avoiding jumps from Android browser toolbar viewport changes.
- Placement spring timing was softened further for slower, smoother scrubbing.
- Mobile placement card dimensions/spacing were tightened to fit Android viewports more cleanly.
- Reduced-motion behavior remains intact.

## Verification

GitHub Actions run `36252129110` passed:

- frozen dependency install
- checkpoint validation
- production dependency security audit
- ESLint
- strict TypeScript
- Vitest
- optimized Next.js production build

## Next

Continue with credentialed deployment/integration verification. During deployed mobile smoke testing, specifically verify the landing header, hero typography/background, and that the placement split visibly progresses from whole file → trunk → 3 ranges → verified state while scrolling in Android browsers.

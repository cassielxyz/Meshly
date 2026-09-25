# Meshly checkpoint — public dark mode + source/credit chrome complete

**Date:** 2026-09-26  
**Verified runtime/UI commit:** `18f8a461dbc735302f0b8ea8a2d81b4c2e13c0db`  
**Verification:** GitHub Actions run `36198114419`

## Completed

- Added persistent public light/dark toggle with local preference storage and system-dark fallback.
- Added class-based dark mode support for Tailwind utilities.
- Added polished dark variants for landing and demo surfaces while preserving the dedicated dark placement-story section.
- Existing authenticated workspace dark tokens remain supported through account appearance settings.
- Added compact adaptive top controls on public routes: GitHub `View source` link + theme toggle.
- `View source` points to `https://github.com/cassielxyz/Meshly`.
- Added public footer credit: `Built with curiosity, shipped with care — cassiel.`
- Footer links to the full GitHub profile `https://github.com/cassielxyz` with GitHub icon.
- Mobile layout keeps the controls below the sticky header; desktop places them compactly in the top chrome.

## Verification

The verified commit passed:

- frozen dependency install
- checkpoint validation
- production dependency security audit
- ESLint
- strict TypeScript
- Vitest
- optimized Next.js production build

An initial theme-toggle implementation was rejected by the React Hooks lint rule because it synchronously set state inside an effect. It was replaced with a state-free DOM-synchronized toggle before verification.

## Next

Continue the credential/deployment phase only. Do not rebuild this dark-mode/source-credit work unless deployed visual testing finds a concrete issue.

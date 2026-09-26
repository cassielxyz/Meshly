# 2026-09-27 — Public multicloud + encrypted-storage story

## Milestone

Meshly’s public landing page and interactive demo now match the current storage architecture instead of the retired Google cross-account sharding concept.

## Implemented

- Landing page now presents **Google Drives** and **Other Clouds** as distinct areas.
- Google messaging uses whole-file placement only: Meshly can Auto choose or use a user-selected healthy Google account, but one managed file stays in one Google account.
- Public security story explains that every new Meshly-managed file is encrypted before provider storage.
- The prior scroll visual that split one Google file across several accounts was replaced with **encrypt → route → verify**.
- `/demo` was rebuilt around:
  1. Connect storage;
  2. Choose destination;
  3. Encrypt;
  4. Transfer;
  5. Verify & ready.
- Demo fixture labels no longer imply that one Google-managed file spans accounts.
- Reduced-motion behavior, mobile/Android-safe layout and the existing 6.2-second guided demo cadence are preserved.
- The public copy does not describe the current backend-trusted encryption design as zero-knowledge.

## Continuation hardening included in this milestone

Meshly now separates last-verified milestone state from active/in-flight work:

- `HANDOFF.md`
- `NEXT_ACTION.md`
- `.meshly/current-task.json`
- `.meshly/resume-state.json`

`AGENTS.md`, `CONTINUE.md`, and `pnpm checkpoint:check` were extended to require/use these layers. This lets a new agent reconstruct both stable progress and an interrupted active branch without asking the user to recreate chat history.

## Verification

Runtime/checkpoint commit: `c4cbebb0541637d1608f7372f9accb45366a5d74`  
GitHub Actions run: `36268194577`

Passed:

- frozen pnpm install;
- checkpoint validation;
- production dependency security audit;
- ESLint;
- strict TypeScript;
- Vitest;
- optimized Next.js production build.

This is code/CI verification only. It does not prove real Google OAuth, real encrypted cloud objects, production PostgreSQL, or deployed provider round trips.

## Next

1. Merge the verified public-story PR after the checkpoint-only CI run is green.
2. Scan remaining product/docs for obsolete public Google pooling/sharding/split-across-accounts claims; preserve generic provider-capability split logic where valid.
3. Add/verify public Privacy and Terms pages/links for OAuth/deployment readiness.
4. Continue production database/OAuth/deployment setup and real encrypted provider verification.

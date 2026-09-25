# Contributing to Meshly

Thank you for improving Meshly. Keep changes small, typed and testable.

1. Fork or branch from `main`.
2. Install with `pnpm install` on Node 22+.
3. Copy `.env.example` to `.env.local` only when testing authenticated flows.
4. Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` before opening a pull request.
5. Never commit Google credentials, refresh tokens, database URLs or real user metadata.

Storage changes should include planner/manifest tests. Security-sensitive changes should document the threat they address and the expected authorization boundary.

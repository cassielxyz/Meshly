# Meshly active handoff

> Read this after `AGENTS.md`. It records work that may be newer than the canonical milestone in `CHECKPOINT.md`.

**Updated:** 2026-09-27  
**Repository:** `cassielxyz/Meshly`  
**Active branch:** `work/dropbox-encrypted-transfers`  
**Active PR:** `#13` — `feat: add encrypted Dropbox managed transfers`  
**Base main:** `684faf96f1ab7ddf9edb0f63de2c3b8749c2bc1f`  
**Latest verified branch CI:** `36320647090` at `ad2539abc9c9a22db25083b2f78e68a6b1c97e17`  
**Verified production deployment before this branch:** `dpl_3HheJK8KK8ifoGEJfsgjBChoY5hj`

## Active task

Complete the activation-gated encrypted Dropbox managed-file path without claiming live provider verification. Keep `DROPBOX_MANAGED_UPLOADS_ENABLED=false` until real production Dropbox credentials pass upload/download/hash, resume/retry, integrity, delete and recovery tests.

## Verified on this branch

GitHub Actions run `36320647090` passed install, checkpoint validation, production dependency audit, lint, typecheck, tests and Next.js build.

The branch now contains:

- migration `0007_provider_objects.sql` and a provider-object persistence model separate from Google `chunks`;
- browser-side Meshly encryption v1 reused for Dropbox managed uploads;
- encrypted upload proxy slices capped at 3 MiB so provider OAuth/session secrets stay server-side and requests remain below the hosting request-body ceiling;
- official Dropbox upload-session start/append/finish primitives with offset reconciliation;
- opaque `/Meshly Storage/msh_*.bin` physical names; original logical names remain in Meshly metadata;
- remote file/size verification before the logical file becomes `ready`;
- encrypted ranged Dropbox download and server-side frame decryption using the same Meshly v1 format;
- safe pending-upload abort, permanent provider-object deletion and provider-account disconnect guards;
- provider-object integrity checks for remote existence/type/size;
- recovery manifest payload version 3 including provider-account identities and provider-object locations, while excluding OAuth tokens, provider upload-session IDs and plaintext file keys;
- readiness schema check extended to `provider_objects`, reporting `providerSchema: "v2"` after migration;
- explicit `DROPBOX_MANAGED_UPLOADS_ENABLED` feature gate, off by default.

## Still not verified / not active

- No real Dropbox encrypted production round trip has been run yet.
- The production database does not have migration `0007` until this PR is merged and a production deploy succeeds.
- The Dropbox managed-upload safety gate must remain off until live verification passes.
- TeraBox encrypted managed transfer is not implemented yet; its auth/quota/browse foundation remains available.
- MEGA remains disabled pending an official SDK-backed worker.
- User-completed Full Drive indexing and exact Google quota comparison are still pending browser verification.
- Meshly must not be called `production_verified` yet.

## Next actions

1. Merge PR #13 only after the latest branch CI remains green.
2. Let the production migration runner apply `0007_provider_objects.sql`; verify `/api/readiness` returns HTTP 200 with `providerSchema: "v2"` while the Dropbox upload gate stays off.
3. Continue non-secret-safe work on TeraBox encrypted transfers and provider UI while waiting for external provider credentials.
4. When Dropbox application credentials are configured outside chat, connect a test account and live-test encrypted upload -> opaque object -> download/decrypt SHA-256 equality, interrupted/retried transfer, integrity scan, permanent delete and recovery restore.
5. Only after those tests pass may `DROPBOX_MANAGED_UPLOADS_ENABLED=true` be set in production and exposed as an active upload destination.
6. Separately complete the pending Full Drive existing-file/quota verification in the authenticated browser.

## Invariants

- Never request or store production secrets, provider credentials, passwords, OAuth codes, cookies or tokens in chat/repository files.
- New Meshly-managed files remain encrypted before provider storage.
- Provider OAuth and upload-session secrets stay server-side and encrypted at rest.
- No logical file becomes `ready` before the remote encrypted object is verified.
- Google managed files remain whole-file-only in one Google account.
- Provider connection/browsing does not equal encrypted-upload support.
- Dropbox upload support stays feature-gated until provider-specific live tests pass.
- Current encryption is backend-trusted, not zero-knowledge.
- Repository/deployment state newer than this handoff wins.

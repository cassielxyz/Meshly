# Meshly checkpoint — multi-cloud provider foundation

Date: 2026-09-27

Verified runtime commit: `794e04f890dcbfc1b42310a069e789c51447a4cc`

Verified GitHub Actions run: `36264515505`

## Product-direction change

Meshly no longer treats multiple Google accounts as one cross-account sharded storage pool. Google Drives is now a dedicated storage area using whole-file placement. Other providers live in a separate Other Clouds area behind a capability-driven provider adapter layer.

The generic split planner remains in the codebase only for future providers/use cases that explicitly permit distributed physical objects.

## Implemented

- Added provider registry for Google Drive, TeraBox, Dropbox, MEGA and experimental MediaFire.
- Added provider capability and transfer profiles.
- Added a dedicated Other Clouds workspace route/UI.
- Renamed Google-facing navigation to Google Drives, Google Storage and Google Accounts.
- Changed Google upload planning to whole-file-only by default.
- Added optional selected-account planning through `accountId`.
- Disabled Google cross-account splitting in `/api/uploads/plan`.
- Added adaptive concurrency/backoff helpers.
- Added conservative TeraBox defaults: one active upload and one upload part at a time initially.
- Added tests for provider invariants, Google whole-file planning and transfer policy.
- Rewrote architecture around provider-independent storage layers and future Android reuse.
- Added open-source reference notes for rclone, Cloudreve, OpenList/AList and TeraBox uploader implementations.
- Updated README to match the new direction and clearly state that mandatory encrypted file-byte storage is the next milestone, not already complete.

## Verification

GitHub Actions run `36264515505` passed:

- frozen dependency install
- checkpoint validation
- production dependency security audit
- ESLint
- strict TypeScript
- Vitest
- optimized Next.js production build

## Security status

Refresh-token encryption already exists. Mandatory encryption of every Meshly-managed file object does **not** exist yet. The current Google browser upload path still sends source file bytes directly to Google resumable upload sessions.

The next milestone must add a versioned streaming/framed encrypted object format, per-file keys, wrapped-key metadata, ciphertext integrity verification and corresponding download/integrity/recovery/share support before encryption can be described as complete.

## Next milestone

Implement mandatory encrypted managed-file storage end-to-end, then expose manual Google-account destination selection and update public landing/demo content to the new multi-cloud product model.

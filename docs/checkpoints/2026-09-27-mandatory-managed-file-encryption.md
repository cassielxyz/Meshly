# Meshly checkpoint — mandatory managed-file encryption v1

Date: 2026-09-27

Verified runtime commit: `e840debf672dbd4afcc902a8c696c727aac74cd8`

Verified GitHub Actions run: `36265487653`

## Milestone

Meshly now has a versioned mandatory encrypted storage format for every **new Meshly-managed file**. The cloud provider receives ciphertext rather than the original file bytes. There is no plaintext-storage toggle for new managed uploads.

This milestone is code/CI verified only. A real Google upload/download round trip remains pending production database, credentials and OAuth setup.

## Implemented

- Added migration `0005_managed_file_encryption.sql`.
- Added per-file encryption metadata to `logical_files` and physical ciphertext metadata to `chunks`.
- Added a fresh random 256-bit data-encryption key per logical file.
- Added HKDF-SHA256 domain separation from `TOKEN_ENCRYPTION_KEY` for file-key wrapping.
- Wrapped per-file keys with AES-256-GCM bound to logical file ID.
- Added framed AES-256-GCM file-byte format.
- Added random 8-byte nonce prefixes plus 32-bit frame indices for unique 96-bit IVs.
- Added AAD binding for encryption version, file ID, logical size and frame index.
- Chose plaintext frame size `8 MiB - 16 bytes`, making every full ciphertext frame exactly 8 MiB including its GCM authentication tag.
- Browser upload path now encrypts frames before sending bytes to Google resumable upload sessions.
- Google physical objects for new managed files use opaque `.bin` names.
- Planner checks encrypted physical size against account free capacity.
- Commit verification distinguishes logical/plaintext SHA-256 from physical ciphertext SHA-256 and encrypted byte length.
- Managed download path maps plaintext Range requests to required encrypted frames, fetches only those ciphertext ranges, authenticates/decrypts and streams the requested plaintext bytes.
- Existing legacy managed files and external Full Drive indexed files remain readable.
- Integrity scanner checks encrypted physical size/checksum for encryption-v1 files.
- Recovery snapshots include wrapped key/encryption/ciphertext metadata and never include raw per-file keys.
- Readiness checks verify the new schema columns.

## Tests and CI

After fixing TypeScript narrowing and Vitest path-resolution issues, run `36265487653` passed all repository gates:

- frozen install — PASS
- checkpoint validation — PASS
- production dependency security audit — PASS
- ESLint — PASS
- strict TypeScript — PASS
- Vitest — PASS
- optimized Next.js build — PASS

Encryption-specific coverage includes:

- deterministic frame layout;
- 8 MiB full ciphertext frames;
- plaintext Range → encrypted-frame mapping;
- unique IV derivation;
- file-key wrapping/unwrapping;
- file-ID binding for wrapped keys;
- unique keys and nonce prefixes;
- authenticated frame encrypt/decrypt round trip;
- tampered ciphertext rejection.

## Trust-model note

The implementation is **not zero-knowledge with respect to the Meshly backend**. The authenticated planning endpoint creates the random per-file key and returns it to the browser over TLS while persisting only a wrapped form. The authenticated server path unwraps keys for managed downloads.

Do not market the current implementation as zero-knowledge E2EE.

## Still pending real integration

- Apply migrations through `0005` to production PostgreSQL.
- Finish production environment variables and Google OAuth testing setup.
- Upload a real file and inspect Google Drive to verify opaque name + ciphertext object.
- Download/decrypt and compare SHA-256 against the source.
- Test selected-account upload.
- Test interrupted/resumed encrypted upload at frame boundaries.
- Test real integrity degradation/tamper behavior.
- Run recovery snapshot → restore → decrypt rehearsal.
- Verify encrypted sharing and deployed range requests.

## Next implementation milestone

Add manual Google-account destination selection to the upload UI, remove remaining "storage pool" wording, then update the landing page and `/demo` to the current Google Drives + Other Clouds + mandatory encryption product model.

# Meshly architecture

Meshly is a provider-independent logical filesystem with dedicated storage sections for **Google Drives** and **Other Clouds**. The web client is the first client; the storage core must stay reusable by a future Android app and other clients.

## Product boundaries

### Google Drives

- Users may connect multiple authorized Google accounts.
- Meshly presents them in one Google-focused workspace.
- Managed uploads use **whole-file placement only**: one logical file is stored in one selected or automatically chosen Google account.
- Google accounts are not used for cross-account sharding.
- Generic split logic remains isolated for providers/use cases that explicitly permit distributed physical parts.

### Other Clouds

TeraBox, Dropbox, MEGA and future providers use a provider adapter layer. MediaFire remains experimental until current supported production API access is verified.

Each provider declares capabilities and a transfer profile: resumability, upload concurrency, part concurrency, retry behavior and whether distributed physical parts are permitted.

## Mandatory managed-file encryption

Every **new Meshly-managed file** uses encrypted storage format v1. There is no plaintext-storage setting.

Encryption v1:

- creates a fresh random 256-bit data-encryption key per logical file;
- derives a dedicated file-key wrapping key from `TOKEN_ENCRYPTION_KEY` with HKDF-SHA256 and domain-separated context;
- wraps the per-file key using AES-256-GCM bound to the logical file ID;
- uses independently authenticated AES-256-GCM frames for file bytes;
- uses an 8-byte random nonce prefix plus a 32-bit frame index to construct each unique 96-bit GCM IV;
- binds each frame to version, file ID, logical size and frame index using AAD;
- uses a plaintext frame size of `8 MiB - 16 bytes`, producing exactly 8 MiB for each full ciphertext frame including the authentication tag;
- stores logical/plaintext size and SHA-256 separately from physical ciphertext size and SHA-256;
- never stores plaintext per-file keys in PostgreSQL or recovery manifests.

Opaque physical object names are used for new managed Google uploads. Existing legacy managed files (`encryption_version = 0`) remain readable for compatibility. Externally indexed Full Drive files are not re-encrypted because Meshly does not own their existing provider objects.

Encryption v1 is code/CI verified, but production provider round trips remain a deployment verification requirement.

### Trust model

The current implementation is **not zero-knowledge with respect to the Meshly backend**. The authenticated upload-planning endpoint generates the per-file key, stores only its wrapped form, and returns the raw key to the browser over TLS for client-side file-byte encryption. Downloads unwrap/decrypt on the authenticated Meshly server path so existing sharing and HTTP Range semantics continue to work.

Do not describe this architecture as end-to-end zero-knowledge encryption.

## Transfer engine

The transfer scheduler is provider-aware rather than globally threaded:

- Google Drive: resumable encrypted uploads, whole-file account placement, provider-safe retry behavior.
- TeraBox: conservative default of one active file and one upload part at a time; hashing/encryption preparation may run ahead of the remote queue.
- Dropbox/MEGA: adaptive concurrency may be enabled only within provider-documented limits.
- `408`, `429` and transient server failures back off rather than increasing pressure.

Transport chunking and Meshly distributed storage parts are different concepts. A provider may support multipart/resumable transport without allowing Meshly to persist one logical file as several separate provider objects.

## Managed upload flow

Client → `/api/uploads/plan` → capability/account selection → generate per-file DEK → persist wrapped key + encryption metadata → return raw DEK to authenticated browser → streaming/frame encryption + plaintext/ciphertext hashing → provider resumable transport → remote ciphertext size/checksum verification → logical commit.

A logical file must never become `ready` until its required physical object verifies.

For Google managed uploads, exactly one physical encrypted object currently represents one logical file.

## Managed download flow

Client → `/api/files/:id/download` → validate ownership/share grant → load encryption metadata → unwrap file key → map requested plaintext range to encrypted frames → range-fetch physical ciphertext → authenticate/decrypt each frame → slice requested plaintext range → stream response.

Legacy managed files use the previous plaintext provider-object path only for backward compatibility. External indexed Google Drive items continue using provider-native download/export behavior.

## Integrity

For encryption v1, integrity tracks two layers:

- logical plaintext SHA-256 for the original file;
- physical ciphertext SHA-256 + encrypted byte length for the provider object.

Provider-side integrity scans compare encrypted physical size and provider checksum when available. AES-GCM authentication detects modified frames during download even when a provider checksum is unavailable.

## Recovery

PostgreSQL is the primary logical index. Recovery snapshots contain the metadata required to reconstruct managed files, including wrapped file keys, encryption version, nonce prefixes, frame sizing, ciphertext hashes and physical sizes.

Recovery metadata must never contain provider refresh tokens, application secrets or plaintext file keys. Recovery documents are signed/authenticated by the existing recovery mechanism; wrapped file keys still depend on the configured Meshly root encryption key.

## Provider adapter contract

Every adapter must supply or explicitly disable:

1. authentication lifecycle;
2. quota/health lookup;
3. folder and object operations;
4. resumable/multipart transport behavior;
5. retry/throttling policy;
6. encryption-v1 object compatibility;
7. integrity metadata;
8. disconnect/dependency safeguards;
9. recovery metadata support;
10. capability tests.

A provider adapter must not be promoted to production-active until encrypted upload/download behavior is verified against that provider.

## Google OAuth modes

- **Managed mode (default):** narrow Drive access for Meshly-created/app-authorized content.
- **Full mode (optional):** broader indexing of an existing Drive and subject to applicable Google production verification/security-review requirements.

Full Drive indexing does not change the rule that newly uploaded Meshly-managed files use whole-file account placement and encryption v1.

## Client independence

Provider, encryption-format, manifest and transfer policy code must remain outside React/Next.js UI components so the same storage format and provider behavior can later be used by Android and desktop clients without rewriting the cloud layer.

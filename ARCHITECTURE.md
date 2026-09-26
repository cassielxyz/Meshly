# Meshly architecture

Meshly is a provider-independent logical filesystem with dedicated storage sections for **Google Drives** and **Other Clouds**. The web client is the first client; the storage core must stay reusable by a future Android app and other clients.

## Product boundaries

### Google Drives

- Users may connect multiple authorized Google accounts.
- Meshly presents them in one Google-focused workspace.
- Managed uploads use **whole-file placement only**: one logical file is stored in one selected or automatically chosen Google account.
- Google accounts are not used for cross-account sharding.
- Existing generic split logic remains isolated for providers/use cases that explicitly permit distributed physical parts.

### Other Clouds

TeraBox, Dropbox, MEGA and future providers use a provider adapter layer. MediaFire remains experimental until current supported production API access is verified.

Each provider declares capabilities and a transfer profile: resumability, upload concurrency, part concurrency, retry behavior and whether distributed physical parts are permitted.

## Security invariant

The target Meshly storage format is **encrypted by default with no plaintext-storage mode**. Provider adapters must not become production-active until they support the common encrypted-object format, integrity verification, key lifecycle and recovery rules.

The current Google managed upload path predates that encrypted-object format and remains a migration target. Do not describe mandatory file encryption as production-complete until the encrypted upload/download round trip is implemented and verified.

## Transfer engine

The transfer scheduler is provider-aware rather than globally threaded:

- Google Drive: resumable uploads with adaptive concurrency and whole-file account placement.
- TeraBox: conservative default of one active file and one upload part at a time; hashing/encryption preparation may run ahead of the remote queue.
- Dropbox/MEGA: adaptive concurrency can be enabled only within provider-documented limits.
- `408`, `429` and transient server failures back off rather than increasing pressure.

Transport chunking and Meshly distributed storage parts are different concepts. A provider may support multipart/resumable transport without allowing Meshly to persist one logical file as several separate provider objects.

## Upload flow

Client → `/api/uploads/plan` → provider capability/policy check → account/provider selection → encrypted-object preparation (migration milestone) → provider resumable/multipart transport → remote verification → logical commit.

A logical file must never become `ready` until all required physical objects verify.

## Download flow

Client → `/api/files/:id/download` → validate ownership/share grant → resolve provider object(s) → verify/decrypt → reconstruct in deterministic order when applicable → verify logical integrity → stream to client.

## Provider adapter contract

Every adapter must supply or explicitly disable:

1. authentication lifecycle;
2. quota/health lookup;
3. folder and object operations;
4. resumable/multipart transport behavior;
5. retry/throttling policy;
6. encrypted-object compatibility;
7. integrity metadata;
8. disconnect/dependency safeguards;
9. recovery metadata support;
10. capability tests.

## Google OAuth modes

- **Managed mode (default):** narrow Drive access for Meshly-created/app-authorized content.
- **Full mode (optional):** broader indexing of an existing Drive and subject to applicable Google production verification/security-review requirements.

## Metadata and recovery

PostgreSQL is the primary logical index. Recovery metadata must never contain provider refresh tokens, application secrets or plaintext encryption keys. Recovery copies should contain only authenticated/encrypted filesystem and physical-object metadata required to rebuild the index.

## Client independence

Provider, encryption, manifest and transfer policy code must remain outside React/Next.js UI components so the same storage format and provider behavior can later be used by Android and desktop clients without rewriting the cloud layer.

# Security policy

Meshly handles OAuth credentials and user cloud data, so security changes are treated as product changes rather than optional hardening.

## Current controls

- OAuth state validation and PKCE
- HttpOnly, SameSite session cookies
- AES-256-GCM encryption for Google refresh tokens at rest
- scoped Managed mode using `drive.file` by default
- mandatory encryption v1 for every new Meshly-managed file before provider storage
- fresh random 256-bit data key per managed file with wrapped-key persistence
- framed AES-256-GCM authentication for managed file content
- opaque provider object names for new encrypted managed uploads
- separate logical plaintext and physical ciphertext size/hash metadata
- authorization checks on upload commit, encrypted download/range access, shares and recovery paths
- safe storage reserve before placement
- remote encrypted-object size/hash verification before logical commit
- CSP, HSTS, frame denial, content-type sniffing protection and restrictive permissions policy
- protected maintenance endpoint and same-origin mutation guards
- no secrets in the repository; `.env` files are ignored

## Encryption trust model

Cloud providers receive ciphertext for new Meshly-managed files, but the current Meshly backend remains trusted: the authenticated planning/download paths participate in file-key handling. Do **not** describe the current design as zero-knowledge or provider-only end-to-end encryption.

Legacy managed files created before encryption v1 and externally indexed provider content can remain readable for compatibility; the mandatory-encryption invariant applies to **new Meshly-managed uploads**.

## Secret requirements

`TOKEN_ENCRYPTION_KEY` must be exactly 32 cryptographically random bytes encoded with base64. `SESSION_SECRET` should contain at least 32 random bytes. Recovery, share-grant and cron secrets must be independent. Never reuse these values as a Google client secret, database password, or each other.

Never commit or paste production secrets, refresh tokens, resumable upload-session URLs, plaintext file keys, private provider object URLs, or credential-bearing database URLs into issues, checkpoint files, test evidence, screenshots, or chat.

## Storage invariants

- Google managed files stay whole in one Google account, whether Meshly Auto chooses the account or the user selects it.
- Google cross-account managed-file sharding is disabled.
- Resumable/multipart transport does not imply persistent distributed storage.
- Generic distributed physical parts require an explicit provider/use-case capability.
- A logical file must not become ready until all required encrypted provider objects verify.
- Storage accounts with dependent managed objects must not be disconnected/deleted without a safe migration/removal path.
- Recovery manifests must never contain OAuth refresh tokens, application secrets or plaintext file keys.

## Reporting

Please do not publish security-sensitive reports as public GitHub issues. Contact the repository owner privately with reproduction steps, affected commit, impact and a minimal proof of concept.

## Security review checklist

Before a public hosted release, run dependency auditing, OAuth consent/scope review, authorization tests, rate-limit tests, malicious filename tests, SSRF checks, large encrypted-file interruption/resume tests, ciphertext tamper tests, corrupted-manifest tests, account-ownership/destination tests, share-control tests and recovery rehearsal. A dedicated OWASP/Strix-style adversarial pass should be completed before calling a deployment production-ready.

# Security policy

Meshly handles OAuth credentials and user cloud data, so security changes are treated as product changes rather than optional hardening.

## Current controls

- OAuth state validation and PKCE
- HttpOnly, SameSite session cookies
- AES-256-GCM encryption for Google refresh tokens at rest
- scoped Managed mode using `drive.file` by default
- authorization checks on upload commit and download reconstruction
- safe storage reserve before placement
- remote object-size verification before commit
- SHA-256 logical and chunk checksums
- CSP, frame denial, content-type sniffing protection and restrictive permissions policy
- no secrets in the repository; `.env` files are ignored

## Secret requirements

`TOKEN_ENCRYPTION_KEY` must be exactly 32 cryptographically random bytes encoded with base64. `SESSION_SECRET` should contain at least 32 random bytes. Never reuse either value as a Google client secret or database password.

## Reporting

Please do not publish security-sensitive reports as public GitHub issues. Contact the repository owner privately with reproduction steps, affected commit, impact and a minimal proof of concept.

## Security review checklist

Before a public hosted release, run dependency auditing, OAuth consent/scope review, authorization tests, rate-limit tests, malicious filename tests, SSRF checks, large-file interruption tests, corrupted-manifest tests and cross-account ownership tests. A dedicated OWASP/Strix-style adversarial pass should be completed before calling a deployment production-ready.

# Meshly production integration testing

This document is the credential-dependent verification phase. Do not mark Meshly `production_verified` until every **required** test below passes against the deployed production candidate.

Never paste OAuth secrets, database passwords, refresh tokens, Google upload-session URLs, plaintext file keys, share passwords, or user file contents into reports or checkpoint files.

## 1. Automated deployment preflight

After migrations through `0005_managed_file_encryption.sql` and deployment, run:

```bash
pnpm production:preflight https://YOUR_DOMAIN
```

Optional local evidence file:

```bash
pnpm production:preflight https://YOUR_DOMAIN --report=.meshly/preflight-report.json
```

The report path is intended to remain local/CI-artifact-only. The automated preflight checks:

- landing page availability;
- CSP, anti-framing and HTTPS/HSTS security headers;
- `/api/health`;
- `/api/readiness`, including environment validation, database reachability and schema/migration presence;
- Google OAuth start redirect and PKCE S256;
- unauthenticated maintenance rejection;
- cross-origin unsafe API mutation rejection.

A successful automated preflight does **not** replace the real-user tests below.

## 2. Required real-user tests

| ID | Test | Pass condition |
|---|---|---|
| `oauth_login` | Google sign-in/callback | User reaches Meshly workspace and session survives a refresh. |
| `second_account` | Connect a second Google account | Both accounts appear independently and quota/health reflect Google responses. |
| `small_encrypted_round_trip` | Upload/download a small deterministic managed file | Download SHA-256 exactly matches original SHA-256 and the logical file becomes ready only after remote verification. |
| `auto_account_round_trip` | Upload with **Auto choose** | One healthy Google account is selected; the whole encrypted file is stored in that account; downloaded plaintext SHA-256 matches the source. |
| `selected_account_round_trip` | Explicitly select a healthy connected Google account | The whole encrypted file is stored in the selected account; download SHA-256 matches the source. |
| `ciphertext_object_inspection` | Inspect the provider object created by a managed upload | Remote object uses Meshly's opaque managed-object naming/metadata expectations and contains ciphertext rather than the original plaintext bytes/name. |
| `resumable_encrypted_resume` | Interrupt a large encrypted upload and resume/retry | Resume occurs from a valid encrypted-frame/transport boundary; no corrupt ready file is published; final download hash matches the source. |
| `integrity_scan` | Run integrity verification | Ciphertext size/hash and required managed-object metadata verify; a controlled unavailable/tampered test object is detected without exposing plaintext. |
| `recovery_rehearsal` | Write recovery snapshot then restore in a disposable/test dataset | Signed snapshot is discovered; logical/physical metadata and wrapped encryption metadata restore without plaintext file keys; restored file can be decrypted correctly. |
| `share_controls` | Create public share with password, expiry/download cap, then revoke | Wrong password is rejected/rate-limited, allowed encrypted managed-file download works, cap/expiry/revoke are enforced. |
| `maintenance_cron` | Invoke scheduled maintenance with configured cron secret | Authenticated invocation succeeds; unauthenticated invocation remains 401. |
| `desktop_smoke` | Production desktop browser test | Navigation, Auto/manual upload destination, upload, preview/download, settings and account management have no blocking UI issues. |
| `mobile_smoke` | Production mobile browser test | Responsive navigation, destination selector, upload controls and core file actions are usable without overflow/blocking issues. |

Google managed files are intentionally **not** tested for cross-account sharding: the current invariant is one managed Google file → one Google account.

## 3. Optional / gated test

`full_drive_sync` is required only when Full Drive mode will be enabled for the release. It must be tested with an OAuth client permitted to use the broader Drive scope. Managed mode remains the default public mode otherwise.

Other-cloud provider adapters become required integration tests only after the corresponding adapter is production-enabled and capability-gated.

## 4. Encrypted whole-file hash test

Use a deterministic local test file. Record only a non-sensitive test identifier, byte size and hashes—not private file contents or account identifiers.

Before upload:

```bash
sha256sum meshly-encrypted-round-trip.bin
```

Upload once with **Auto choose** and once with an explicitly selected healthy Google account. After each Meshly download:

```bash
sha256sum downloaded-meshly-encrypted-round-trip.bin
```

The downloaded plaintext SHA-256 must exactly equal the source hash. Separately inspect the corresponding Google object and confirm it is the encrypted managed object expected by Meshly; do not copy provider credentials or sensitive object URLs into the evidence report.

On Windows PowerShell:

```powershell
Get-FileHash .\meshly-encrypted-round-trip.bin -Algorithm SHA256
Get-FileHash .\downloaded-meshly-encrypted-round-trip.bin -Algorithm SHA256
```

## 5. Evidence and checkpoint update

Use `docs/integration-results.template.json` as the shape for a local test record. Do not commit a filled report if it contains account identifiers, deployment secrets, private URLs, provider object IDs, session URLs or sensitive operational details.

After every required test is genuinely passing:

1. run `pnpm release:check` and `pnpm verify` again;
2. update all checkpoint layers (`CHECKPOINT.md`, `HANDOFF.md`, `NEXT_ACTION.md`, `.meshly/project-state.json`, `.meshly/current-task.json`, `.meshly/resume-state.json`) to `production_verified`/completed state as appropriate;
3. add a dated milestone under `docs/checkpoints/` containing only non-sensitive pass/fail evidence;
4. create the release/tag only after the checkpoint reflects the verified state.

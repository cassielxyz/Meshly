# Meshly production integration testing

This document is the credential-dependent verification phase. Do not mark Meshly `production_verified` until every **required** test below passes against the deployed production candidate.

Never paste OAuth secrets, database passwords, refresh tokens, Google upload-session URLs, share passwords, or user file contents into reports or checkpoint files.

## 1. Automated deployment preflight

After migrations and deployment, run:

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
| `second_account` | Connect a second Google account | Both accounts appear independently and quota totals reflect Google responses. |
| `small_round_trip` | Upload/download a small deterministic test file | Download SHA-256 exactly matches original SHA-256. |
| `cross_account_round_trip` | Force one file to span at least two accounts | UI exposes one logical file; reconstruction succeeds; whole-file SHA-256 exactly matches original. |
| `resumable_resume` | Interrupt a large upload and resume/retry | No corrupt ready file is published; transfer resumes/retries to a verified ready state. |
| `integrity_scan` | Run integrity verification | Stored parts are verified and healthy file remains ready; an intentionally unavailable test part is detected in a controlled test if safe to do so. |
| `recovery_rehearsal` | Write recovery snapshot then restore in a disposable/test dataset | Signed snapshot is discovered and logical file/chunk metadata reconstructs correctly. |
| `share_controls` | Create public share with password, expiry/download cap, then revoke | Wrong password is rejected/rate-limited, allowed download works, cap/expiry/revoke are enforced. |
| `maintenance_cron` | Invoke scheduled maintenance with configured cron secret | Authenticated invocation succeeds; unauthenticated invocation remains 401. |
| `desktop_smoke` | Production desktop browser test | Navigation, upload, preview/download, settings and account management have no blocking UI issues. |
| `mobile_smoke` | Production mobile browser test | Responsive navigation, upload controls and core file actions are usable without overflow/blocking issues. |

## 3. Optional / gated test

`full_drive_sync` is required only when Full Drive mode will be enabled for the release. It must be tested with an OAuth client permitted to use the broader Drive scope. Managed mode remains the default public mode otherwise.

## 4. Cross-account hash test

Use a deterministic local test file. Record only filename/test identifier, byte size and hashes—not private file contents.

Before upload:

```bash
sha256sum meshly-cross-account-test.bin
```

After reconstructed download:

```bash
sha256sum downloaded-meshly-cross-account-test.bin
```

The two SHA-256 values must be identical. Also confirm the file's physical allocation spans at least two connected accounts.

On Windows PowerShell:

```powershell
Get-FileHash .\meshly-cross-account-test.bin -Algorithm SHA256
Get-FileHash .\downloaded-meshly-cross-account-test.bin -Algorithm SHA256
```

## 5. Evidence and checkpoint update

Use `docs/integration-results.template.json` as the shape for a local test record. Do not commit a filled report if it contains account identifiers, deployment secrets, private URLs or sensitive operational details.

After every required test is genuinely passing:

1. run `pnpm verify` again;
2. update `CHECKPOINT.md` and `.meshly/project-state.json` to `production_verified`;
3. add a dated milestone under `docs/checkpoints/` containing only non-sensitive pass/fail evidence;
4. create the release/tag only after the checkpoint reflects the verified state.

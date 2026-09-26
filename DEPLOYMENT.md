# Meshly production deployment

Meshly is designed to be deployed only after every item below is satisfied.

## 1. Infrastructure

- PostgreSQL database is provisioned with TLS enabled.
- Run `pnpm db:migrate` against the production database and confirm migrations through `0005_managed_file_encryption.sql`.
- Deploy the repository to Vercel or another Node.js 22+ host.
- Configure the public HTTPS origin in `NEXT_PUBLIC_APP_URL`.
- Confirm the public `/privacy` and `/terms` pages load on the production origin before final OAuth branding/review configuration.

## 2. Google Cloud

- Enable Google Drive API.
- Create an OAuth 2.0 Web application.
- Add the exact production callback: `https://YOUR_DOMAIN/api/auth/google/callback`.
- Configure the OAuth consent screen and authorized domains.
- Use the deployed homepage, Privacy Policy and Terms URLs from the same production origin.
- Managed mode uses OpenID profile/email plus `drive.file` + `drive.appdata`.
- Full mode uses the broader Drive scope and must not be offered publicly until the deployment has completed Google's applicable verification/review requirements.

## 3. Required environment variables

Copy the names from `.env.example` and supply unique production values for all of them.

Generate independent secrets. Do not reuse one value across session, recovery, share-grant, encryption, and cron purposes.

```bash
openssl rand -base64 48  # SESSION_SECRET
openssl rand -base64 32  # TOKEN_ENCRYPTION_KEY (32 raw bytes, base64 encoded)
openssl rand -base64 48  # RECOVERY_SECRET
openssl rand -base64 48  # SHARE_GRANT_SECRET
openssl rand -base64 48  # CRON_SECRET
```

Do not paste production secrets into issue comments, checkpoint files, screenshots, or chat. Store them only in the intended secret manager/environment configuration.

## 4. Automated preflight

After migrations and deployment, run:

```bash
pnpm production:preflight https://YOUR_DOMAIN --report=.meshly/preflight-report.json
```

This verifies the public landing page, security headers, `/api/health`, `/api/readiness`, production environment configuration, database reachability, required migrated schema, Google OAuth redirect/PKCE, cron authentication protection and the cross-origin API mutation guard.

`GET /api/readiness` must return HTTP 200 with `environment`, `database`, and `migrations` all `true` before real-user testing begins.

## 5. Credential-dependent integration tests

Complete every required test in [PRODUCTION_TESTING.md](PRODUCTION_TESTING.md):

1. Sign in with one real Google account.
2. Connect a second account and verify each account's real quota/health response.
3. Upload/download a deterministic managed file and compare plaintext SHA-256.
4. Test an upload using **Auto choose** and confirm the whole encrypted file lands in one healthy Google account.
5. Test an upload to an explicitly selected healthy Google account and confirm the whole encrypted file lands in that account.
6. Inspect the remote managed object and confirm Meshly stores the expected opaque ciphertext object rather than plaintext file bytes/name.
7. Interrupt/resume or retry a large encrypted upload and verify that no incomplete logical file is exposed as ready and the final plaintext hash matches.
8. Run Integrity and a Recovery snapshot/restore/decrypt rehearsal with disposable test data.
9. Verify public-share password, expiration/download cap and revocation controls for an encrypted managed file.
10. Confirm scheduled `/api/maintenance` succeeds with `CRON_SECRET` and remains 401 without it.
11. Smoke-test the deployed desktop and mobile layouts, including Auto/manual destination selection.
12. Test Full Drive sync only if that broader mode will be enabled and the OAuth deployment is eligible for it.

Google managed files must **not** be forced to span accounts. Cross-account sharding is intentionally disabled for the Google managed-file path.

Use `docs/integration-results.template.json` as the local evidence format. A filled evidence file belongs at `.meshly/integration-results.json` and is gitignored.

When every required real integration test passes:

```bash
pnpm release:check
pnpm verify
```

Only then update the checkpoint to `production_verified` and create the release/tag.

## 6. Production invariants

- Every new Meshly-managed file uses encryption v1 before provider storage.
- Google managed files stay whole in one Google account, including Auto and manual destination selection.
- Never log refresh tokens, resumable-upload session URLs, plaintext file keys, recovery secrets, share-grant secrets or decrypted credentials.
- Do not delete/disconnect a storage account while managed objects depend on it.
- Do not publish a logical file until all required physical encrypted objects have completed and verified.
- Recovery manifests must not contain provider refresh tokens or plaintext file keys.
- Keep database backups even though signed recovery manifests can rebuild Meshly-managed metadata.
- Rotate secrets after any suspected exposure.
- Keep `pnpm-lock.yaml` committed and use frozen installs for deterministic builds.
- Do not bypass the production dependency audit to force a release through CI.
- Respect provider capabilities, limits, quotas, terms and rate limits.

## 7. Code verification command

```bash
pnpm verify
```

This runs checkpoint validation, the production dependency audit (`pnpm audit --prod --audit-level high`), lint, strict TypeScript checking, unit tests, and the optimized production build. GitHub Actions uses a frozen lockfile and runs the same verification gate on every pull request and protected release path.

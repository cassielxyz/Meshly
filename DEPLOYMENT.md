# Meshly production deployment

Meshly is designed to be deployed only after every item below is satisfied.

## 1. Infrastructure

- PostgreSQL database is provisioned with TLS enabled.
- Run `pnpm db:migrate` against the production database.
- Deploy the repository to Vercel or another Node.js 22+ host.
- Configure the public HTTPS origin in `NEXT_PUBLIC_APP_URL`.

## 2. Google Cloud

- Enable Google Drive API.
- Create an OAuth 2.0 Web application.
- Add the exact production callback: `https://YOUR_DOMAIN/api/auth/google/callback`.
- Configure the OAuth consent screen and authorized domains.
- Managed mode uses `drive.file` + `drive.appdata`.
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
2. Connect a second account and verify combined real quota.
3. Upload and download a small deterministic file and compare SHA-256.
4. Force a controlled test file to span at least two Google accounts, reconstruct it, and compare whole-file SHA-256.
5. Interrupt/resume or retry a large upload and verify that no incomplete logical file is exposed as ready.
6. Run Integrity and a Recovery snapshot/restore rehearsal with test data.
7. Verify public-share password, expiration/download cap and revocation controls.
8. Confirm scheduled `/api/maintenance` succeeds with `CRON_SECRET` and remains 401 without it.
9. Smoke-test the deployed desktop and mobile layouts.
10. Test Full Drive sync only if that broader mode will be enabled and the OAuth deployment is eligible for it.

Use `docs/integration-results.template.json` as the local evidence format. A filled evidence file belongs at `.meshly/integration-results.json` and is gitignored.

When every required real integration test passes:

```bash
pnpm release:check
pnpm verify
```

Only then update the checkpoint to `production_verified` and create the release/tag.

## 6. Production invariants

- Never log refresh tokens, resumable-upload session URLs, recovery secrets, share-grant secrets or decrypted credentials.
- Do not delete/disconnect an account while managed chunks depend on it.
- Do not publish a logical file until all physical parts have completed and verified.
- Keep database backups even though signed recovery manifests can rebuild Meshly-managed metadata.
- Rotate secrets after any suspected exposure.

## 7. Code verification command

```bash
pnpm verify
```

This runs checkpoint validation, lint, strict TypeScript checking, unit tests, and the optimized production build. GitHub Actions runs the same gate on every push and pull request.

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

## 4. Preflight

After deployment:

1. `GET /api/health` should return the service status.
2. `GET /api/readiness` must return HTTP 200 before traffic is enabled.
3. Sign in with one Google account.
4. Upload and download a small file.
5. Connect a second account and verify combined quota.
6. Test a file large enough to exercise cross-account placement in a controlled test environment.
7. Run Integrity and write a Recovery snapshot.
8. Create, password-protect, download, and revoke a share link.
9. Confirm the scheduled `/api/maintenance` invocation is authenticated with `CRON_SECRET`.

## 5. Production invariants

- Never log refresh tokens, resumable-upload session URLs, recovery secrets, share-grant secrets, or decrypted credentials.
- Do not delete/disconnect an account while managed chunks depend on it.
- Do not publish a logical file until all physical parts have completed and verified.
- Keep database backups even though signed recovery manifests can rebuild Meshly-managed metadata.
- Rotate secrets after any suspected exposure.

## 6. Verification command

```bash
pnpm verify
```

This runs lint, strict TypeScript checking, unit tests, and the optimized production build. GitHub Actions runs the same gate on every push and pull request.

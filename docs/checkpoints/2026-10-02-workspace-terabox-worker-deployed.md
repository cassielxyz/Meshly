# 2026-10-02 — Workspace + gated TeraBox worker deployed

## Milestone

PR #16 (`feat: complete workspace UX and gated TeraBox large-file worker`) passed the exact-head Meshly CI gate, was squash-merged to `main` as `069878312a9409148dde34fad031b4ff5c7fee6d`, and deployed successfully to production as `dpl_9uUDaEdaNxXkGDPGtRYUkY2bkGzb`.

This milestone advances the **verified production runtime** but does **not** mark Meshly `production_verified`; real authenticated Google/provider round trips remain outstanding.

## Exact-head CI verification

PR #16 head `7cf7b84ed7eea07c99b5ed62a0ad59d0c77a529f` passed GitHub Actions run `36919473571`:

- frozen lockfile install;
- checkpoint validation;
- production dependency audit at high severity;
- ESLint;
- strict TypeScript;
- Vitest;
- Next.js production build.

## Production verification

Production deployment `dpl_9uUDaEdaNxXkGDPGtRYUkY2bkGzb` is **READY** and serves main `069878312a9409148dde34fad031b4ff5c7fee6d` at `https://meshly.cassielae.me`.

Live `/api/readiness` returned HTTP 200 with:

```json
{
  "ok": true,
  "environment": true,
  "database": true,
  "migrations": true,
  "encryptionSchema": "v1",
  "providerSchema": "v2",
  "googleQuotaSchema": "v2"
}
```

This closes the previous Vercel deployment-rate blocker and confirms migration `0008_google_quota_breakdown.sql` is live.

## Newly deployed behavior

- Drive bulk selection and star/trash/restore/permanent-delete actions.
- Type filters, sorting and saved list/grid + density preferences.
- Richer share creation with optional password, expiry and download limits.
- Authenticated download history and bounded workspace Analytics.
- Corrected Google quota-category schema/reporting foundation now live.
- Dropbox/TeraBox real provider-state foundations remain behind provider-specific activation rules.
- TeraBox large-file ciphertext worker foundation is deployed behind `TERABOX_LARGE_WORKER_ENABLED=false` by default.
- TeraBox transport fragments are now planned independently from Meshly encryption-frame boundaries.
- Any TeraBox multipart transport layout must keep **every** provider fragment, including the final fragment, above 4 MiB; client/backend/worker validation fail closed on unsafe layouts.

## Safety state

- Every new Meshly-managed file still uses encryption v1.
- Google managed files still remain whole inside one selected/Auto-chosen Google account.
- No cross-account Google sharding was introduced.
- Provider connection/browse does not imply encrypted managed-upload activation.
- Dropbox/TeraBox managed-upload gates stay off until real provider-specific verification passes.
- The TeraBox large-worker gate stays off until a separate HTTPS worker deployment and real multipart provider test passes.
- Current encryption remains backend-trusted, not zero-knowledge.
- No production secrets, OAuth codes, cookies or provider tokens are stored in this checkpoint.

## Still required before production_verified

1. User completes **Show existing files** for the connected Google account, grants read-only Drive access, and confirms pre-existing files index into Meshly.
2. Compare refreshed Meshly total Google usage, Drive usage, Drive trash and free space against Google for the same account.
3. Run real encrypted Google Auto-account and explicit-account upload/download SHA-256 round trips and inspect the opaque remote object.
4. Live-verify Dropbox encrypted upload/download/retry/integrity/delete/recovery before enabling its gate.
5. Live-verify TeraBox small-file encrypted transfer before enabling its managed-upload gate.
6. Deploy the dedicated TeraBox worker with independent secrets, verify health/internal connectivity, run a real multipart encrypted provider round trip including fragment sizing, download/hash, integrity and abort cleanup, then enable the large-worker gate only if all checks pass.
7. Implement an official-SDK-backed MEGA worker before advertising MEGA managed transfers as active.
8. Complete final share/cron/desktop/mobile authenticated smoke verification.

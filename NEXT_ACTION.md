# Meshly — next action

`CHECKPOINT.md` records the latest verified production milestone. `HANDOFF.md` records active work that may be newer.

## Do this next

PR #16 passed the exact-head full CI gate, was squash-merged to main as `069878312a9409148dde34fad031b4ff5c7fee6d`, and deployed successfully as production deployment `dpl_9uUDaEdaNxXkGDPGtRYUkY2bkGzb`.

Live `https://meshly.cassielae.me/api/readiness` is HTTP 200 with environment/database/migrations true, `encryptionSchema: "v1"`, `providerSchema: "v2"`, and `googleQuotaSchema: "v2"`.

The next step is real authenticated Google verification:

1. Open Meshly production and go to the connected Google account.
2. Choose **Show existing files** for the account whose pre-existing Drive files are missing.
3. Complete Google's read-only Drive consent and let Meshly run the initial index.
4. Confirm pre-existing files appear, then refresh live account data and compare total Google usage, Drive usage, Drive trash and free space with Google for the same account.
5. After that, run encrypted Google Auto-account and selected-account SHA-256 round trips.

Dropbox/TeraBox managed-upload gates and the TeraBox large-worker gate must stay off until their real provider-specific verification passes. Do not paste passwords, OAuth codes, cookies, provider tokens or secrets into chat.

# Meshly — next action

`CHECKPOINT.md` records the latest verified production milestone. `HANDOFF.md` records the active authenticated-verification state.

## Do this next

The provider-correctness foundation is deployed and readiness is green with provider schema v1.

The next step is to prove the user-reported Google issues are fixed with the real connected account:

1. Open `https://meshly.cassielae.me/accounts` while signed in.
2. Press **Show existing files** on the Google account whose older Drive files are missing.
3. Complete Google's consent flow. This broader mode is explicit because it requests read-only access to existing Drive files; normal managed sign-in stays narrow.
4. Meshly should return to Accounts and automatically start the initial index for that exact account.
5. Confirm the old Drive files now appear in the unified workspace.
6. Press **Refresh live data** and compare that account's used/total/free values with Google Drive.

Do not paste passwords, OAuth codes, cookies, provider tokens or secrets into chat.

After this passes, run the deterministic encrypted Google Auto-account and selected-account upload/download SHA-256 round trips. Dropbox/TeraBox auth/quota/browse foundations are deployed but need provider application credentials and live verification; encrypted non-Google managed transfers remain the next implementation gate.

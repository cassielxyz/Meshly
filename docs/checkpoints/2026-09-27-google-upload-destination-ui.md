# Meshly checkpoint — Google upload destination UI

Date: 2026-09-27

Verified runtime commit: `7c0439576f0844e177568b5134398172487fd57f`

Verified GitHub Actions run: `36265896346`

## Milestone

The Google Drives upload flow now exposes the whole-file placement choice that the backend already supported. Users can leave placement on **Auto choose** or select one healthy connected Google account before uploading.

This does not restore pooling or sharding. Every managed file stays whole inside one Google account and still uses mandatory encryption v1 before provider storage.

## Implemented

- Workspace shell fetches sanitized `/api/accounts` data.
- New upload menu displays:
  - Auto choose;
  - connected Google accounts;
  - account health/status;
  - available free space.
- Unhealthy accounts cannot be selected.
- Selected account ID is passed into encrypted file upload planning.
- Folder uploads now accept the same selected account and use it for every file in that folder upload.
- Auto mode keeps backend account selection based on whole-file fit and priority.
- Sidebar wording changed from “Storage pool” to **Google storage**, explicitly described as usage across connected accounts.
- “Manage storage” shortcut changed to **Manage Google accounts**.
- Other Clouds receives its own cloud navigation icon.
- Upload progress explicitly says managed transfers are encrypted.

## Verification

GitHub Actions run `36265896346` passed:

- frozen install
- checkpoint validation
- production dependency security audit
- ESLint
- strict TypeScript
- Vitest
- optimized Next.js build

## Still pending real integration

The UI and planner wiring are CI verified but not yet tested with live production credentials. Real testing must confirm:

- Auto choose sends a new encrypted file to one healthy account with enough encrypted physical capacity.
- Manual choice sends the whole encrypted file to exactly the selected account.
- Folder uploads keep the chosen destination and fail clearly if that account runs out of capacity.
- The cloud object is opaque ciphertext and downloads reconstruct/decrypt to the original SHA-256.

## Next milestone

Update the public landing page and `/demo` so they no longer teach the former cross-account Google split model. The public story should show:

1. Google Drives — multiple connected accounts, whole-file Auto/manual placement.
2. Other Clouds — TeraBox, Dropbox, MEGA provider area.
3. Mandatory encryption before provider storage.
4. Provider-aware resumable/fast transfer behavior.

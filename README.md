<p align="center"><img src="docs/assets/meshly-banner.svg" alt="Meshly — all your storage, one workspace" width="100%"></p>

<p align="center"><strong>One workspace across your connected cloud storage.</strong></p>

<p align="center">Google Drives · Other Clouds · resumable transfers · integrity checks · encrypted-storage roadmap</p>

---

## What is Meshly?

Meshly is a unified file workspace for storage you already own across different cloud providers. The product keeps provider details out of the way while still respecting each provider's limits and policies.

Meshly now separates storage into two clear areas:

- **Google Drives** — connect multiple Google accounts, browse them from one Meshly workspace, and upload each managed file as one whole object to a selected or automatically chosen Google account.
- **Other Clouds** — a provider-adapter layer for TeraBox, Dropbox, MEGA and future services. MediaFire stays experimental until supported production API access is verified.

Google cross-account sharding is intentionally disabled. The generic split engine remains isolated for future providers/use cases that explicitly permit distributed physical parts.

## Current product status

The existing Google Drive application is production-code complete for its original managed-file flow and has passed CI, but the product is currently being expanded into the new multi-cloud architecture.

The first multi-cloud foundation is implemented:

- separate **Google Drives** and **Other Clouds** product areas;
- provider capability registry;
- provider-aware transfer profiles;
- Google whole-file-only placement;
- optional explicit Google-account selection at the planner/API layer;
- adaptive transfer/backoff helpers;
- conservative TeraBox profile: one active file and one upload part at a time initially;
- documented rclone, Cloudreve, OpenList/AList and TeraBox uploader references;
- client-independent provider architecture for a later Android app.

### Encryption milestone

Meshly's target storage invariant is simple:

> **Every Meshly-managed file is encrypted before it is stored by a cloud provider. There is no plaintext-storage mode.**

That encrypted file-object format is the **next implementation milestone**. The current Google managed upload path still sends the selected source bytes directly to Google resumable sessions, so this README does not claim file-byte encryption is already complete.

OAuth refresh tokens are already encrypted at rest with AES-256-GCM.

## Provider model

| Area | Provider | State | Initial transfer policy |
| --- | --- | --- | --- |
| Google Drives | Google Drive | Active | whole-file placement, resumable upload, adaptive concurrency |
| Other Clouds | TeraBox | Adapter planned | sequential remote queue, resumable/multipart-aware |
| Other Clouds | Dropbox | Adapter planned | resumable + adaptive concurrency |
| Other Clouds | MEGA | Adapter planned | SDK/API-backed + adaptive concurrency |
| Other Clouds | MediaFire | Experimental | enable only after current production API support is verified |

Provider policies are capability-driven. Multipart **transport** does not automatically mean Meshly may persist one logical file as many separate provider objects.

## Transfer engine

Meshly optimizes transfers per provider instead of using one hard-coded thread count:

1. inspect provider capabilities and account health;
2. choose a compatible destination;
3. use resumable/multipart transport where supported;
4. increase concurrency only for providers that allow adaptive behavior;
5. back off on throttling, timeouts and transient server failures;
6. verify the remote object before promoting a logical file to ready.

For TeraBox, Meshly starts conservatively at one active file and one upload part at a time. Hashing/encryption preparation can run ahead of the remote queue, so the client does useful work without flooding the provider.

## Open-source references

Meshly studies established open-source storage projects instead of reinventing every pattern:

- **rclone** — provider abstraction, retries/throttling, crypt/chunker/combine concepts;
- **Cloudreve** — client upload architecture, resumability and provider-specific concurrency;
- **OpenList / AList** — provider-driver design and TeraBox operational behavior;
- **TeraBox uploader implementations** — multipart sequencing, upload IDs, hashes and finalization.

These are engineering references, not a license to copy code blindly or bypass provider restrictions. Production integrations prefer official provider APIs/SDKs. See [`docs/OPEN_SOURCE_STORAGE_REFERENCES.md`](docs/OPEN_SOURCE_STORAGE_REFERENCES.md).

## Existing Google functionality

The current Google implementation already includes:

- responsive Drive-style logical filesystem;
- folders, files, search, recent/starred/trash and sharing;
- Managed Google OAuth mode and optional broader Full Drive indexing;
- real quota/account health refresh;
- resumable direct-to-Drive uploads;
- incremental SHA-256 hashing;
- upload commit verification;
- HTTP Range downloads;
- integrity scanning;
- signed recovery manifests;
- encrypted refresh tokens;
- health/readiness endpoints, migrations, cron maintenance and deployment preflight;
- responsive light/dark UI and public interactive demo.

Some marketing/demo copy still illustrates the former pooled/split-Google concept and will be updated as part of the new product-direction cleanup.

## Architecture

```text
                         Meshly Core
                              │
               ┌──────────────┴──────────────┐
               │                             │
         Google Drives                  Other Clouds
               │                             │
        Google adapter             Provider adapter layer
                                             │
                                  ┌──────────┼──────────┐
                                  │          │          │
                               TeraBox    Dropbox     MEGA
               └────────────────────┬────────────────────┘
                                    │
                          Provider-aware transfer
                                    │
                       Encrypted storage format
                         (next implementation)
                                    │
                         Integrity + recovery
```

Provider, transfer, encryption and manifest logic stays outside React UI code so the same storage format can later power the Android app without rewriting the cloud layer.

Read [`ARCHITECTURE.md`](ARCHITECTURE.md) for the invariants and provider contract.

## Stack

`Next.js 16.3` · `React 19` · `TypeScript` · `Tailwind CSS 4` · Motion · Drizzle ORM · PostgreSQL · Google OAuth 2.0 · Google Drive API · `hash-wasm` · Vitest

## Quick start

```bash
git clone https://github.com/cassielxyz/Meshly.git
cd Meshly
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

Open `http://localhost:3000`.

## Google configuration

Create a Google OAuth Web application, enable the Drive API, and configure the exact callback in `GOOGLE_REDIRECT_URI`:

```text
https://YOUR_DOMAIN/api/auth/google/callback
```

Managed mode requests OpenID profile/email plus `drive.file` and `drive.appdata`. Full Drive mode is optional and should only be exposed publicly after the deployment satisfies the applicable Google requirements for the broader Drive scope.

See [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Verification

Every pull request and push to `main` runs:

```text
frozen install
→ checkpoint validation
→ production dependency security audit
→ ESLint
→ strict TypeScript
→ Vitest
→ optimized production build
```

Local equivalent:

```bash
pnpm verify
```

## Security

Read [`SECURITY.md`](SECURITY.md) before deployment.

Current application-secret protections include encrypted Google refresh tokens, HttpOnly/SameSite sessions, PKCE/state OAuth, same-origin mutation guards, CSP/HSTS/security headers and protected maintenance endpoints.

The next security milestone is the mandatory encrypted file-object format for every Meshly-managed upload. Recovery metadata must never contain provider refresh tokens, application secrets or plaintext file keys.

## Roadmap from here

1. Implement mandatory streaming file encryption + key wrapping + encrypted manifests.
2. Update downloads, integrity scanning, sharing and recovery to decrypt/verify the encrypted object format.
3. Expose manual Google-account destination selection in the upload UI.
4. Update landing/demo copy away from Google cross-account sharding.
5. Implement the official TeraBox adapter with its conservative transfer queue.
6. Add Dropbox and MEGA adapters.
7. Verify whether MediaFire currently supports a suitable production API before enabling it.
8. Finish production PostgreSQL, credentials, deployment preflight and real round-trip tests.
9. Build the Android client on top of the same provider/encryption/manifest format.

## Durable continuation

Future coding agents must read:

- `AGENTS.md`
- `CHECKPOINT.md`
- `.meshly/project-state.json`
- newest file in `docs/checkpoints/`

The repository checkpoint is the source of truth when chat context is lost.

---

<p align="center"><strong>Meshly</strong> · All your storage. One workspace.</p>

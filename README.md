<p align="center"><img src="docs/assets/meshly-banner.svg" alt="Meshly — all your storage, one workspace" width="100%"></p>

<p align="center"><strong>One Drive-like workspace across multiple Google storage accounts.</strong></p>

<p align="center">Connect accounts · pool real quota · split oversized files safely · resume transfers · reconstruct on demand</p>

---

## What is Meshly?

Meshly is a virtual filesystem for people who keep storage across multiple Google accounts. Instead of browsing each account separately, Meshly presents one logical workspace, one storage meter and one set of folders.

When a file fits safely in one connected account, Meshly keeps it whole. When it does not, the placement engine can split the byte stream into deterministic parts, store those parts across healthy accounts and reconstruct the original file during download without first buffering the entire file on the application server.

<p align="center"><img src="docs/assets/storage-flow.svg" alt="Meshly logical-to-physical storage flow" width="94%"></p>

## Highlights

- **Drive-style workspace** — familiar list/grid navigation, sidebar, search surface, recents, starred, shared, trash and storage views.
- **Unified storage pool** — actual Google quota is stored per connected account and combined into one capacity view.
- **Whole-file-first planner** — fragmentation happens only when no healthy account can safely hold the complete file.
- **Resumable direct uploads** — the backend creates Google Drive resumable sessions; the browser uploads file ranges to those sessions rather than proxying multi-GB payloads through the web server.
- **Large-file integrity** — incremental SHA-256 hashing avoids loading the whole file into browser memory.
- **Cross-account reconstruction** — downloads stream physical parts in logical order and support HTTP byte ranges.
- **Two OAuth modes** — Managed mode uses `drive.file` by default; Full mode is optional for broader indexing use cases.
- **Security-first secrets** — refresh tokens are encrypted with AES-256-GCM and session cookies are HttpOnly/SameSite.
- **Light-first design** — Google-inspired productivity colors with an original Meshly mesh mark; dark-theme tokens are included.

## Product map

The routing shell already covers the major product areas: landing, sign-in, onboarding, My Drive, recent, starred, shared, trash, storage pool, connected accounts, transfer center, activity, integrity, recovery, notifications, diagnostics, help, privacy, profile, and settings for general/storage/transfers/appearance/security/notifications/advanced preferences. Error and 404 states are included too.

Live file browsing/folder mutation is the next data-binding milestone; the current workspace uses representative demo content while authentication, storage planning, resumable upload, commit verification and download reconstruction are implemented in the API layer.

## Stack

`Next.js 16` · `React 19` · `TypeScript` · `Tailwind CSS 4` · shadcn/Radix-style UI primitives · `Drizzle ORM` · PostgreSQL · Google OAuth 2.0 · Google Drive API · `hash-wasm` · Vitest

## Quick start

```bash
git clone https://github.com/cassielxyz/Meshly.git
cd Meshly
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

### Database

Create a PostgreSQL database and execute:

```text
db/migrations/0001_meshly.sql
```

Then set `DATABASE_URL` in `.env.local`.

### Google OAuth

Create an OAuth 2.0 **Web application** in Google Cloud, enable the Google Drive API and configure the callback URL used by `GOOGLE_REDIRECT_URI`, for example:

```text
http://localhost:3000/api/auth/google/callback
```

The default Managed flow requests OpenID profile/email plus `drive.file`. Full Drive mode should only be enabled when the deployment has completed the Google verification required for the broader scope.

### Secrets

Generate fresh values; never copy the examples into production.

```bash
# SESSION_SECRET — 32+ random bytes
openssl rand -base64 48

# TOKEN_ENCRYPTION_KEY — exactly 32 bytes, base64 encoded
openssl rand -base64 32
```

## Transfer model

1. Browser posts name, MIME type and file size to `/api/uploads/plan`.
2. Meshly reads healthy connected-account quota and applies the reserve-aware placement algorithm.
3. The API creates one or more Google Drive resumable sessions.
4. The browser incrementally hashes the selected ranges and uploads them in 8 MiB network chunks.
5. `/api/uploads/commit` verifies the physical objects and marks the logical file ready.
6. `/api/files/:id/download` translates logical ranges into Drive ranges and streams the parts in order.

See [ARCHITECTURE.md](ARCHITECTURE.md) for invariants and recovery design.

## Design system

Meshly intentionally feels familiar to Drive users without copying Google Drive's logo or product identity. The brand uses the Google productivity color family — blue `#4285F4`, green `#34A853`, yellow `#FBBC04`, red `#EA4335` — in an original connected-node mark. UI typography prioritizes **Inter** with **Manrope** as the preferred display companion and system fallbacks for zero-blocking startup.

## Verification

Every push and pull request runs the `Meshly CI` workflow:

```text
install → lint → typecheck → unit tests → production build
```

The storage planner includes tests for whole-file placement, deterministic cross-account splitting and insufficient pooled capacity.

## Security

Read [SECURITY.md](SECURITY.md) before deploying Meshly publicly. Broad Google Drive scopes can require additional OAuth verification/security review. Do not expose refresh tokens or upload-session URLs in logs.

## Roadmap

- Bind Drive UI to the live logical index and implement folder CRUD
- Store signed recovery manifests in Drive `appDataFolder`
- Full existing-Drive indexing for verified Full mode deployments
- Background quota refresh/account-health jobs
- Share links with expiration/password controls
- Versioning, duplicate detection and orphan repair
- PWA/offline metadata cache
- Dedicated OWASP + Strix-style security test suite

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Pull requests should preserve the storage invariants and include tests for placement or manifest changes.

---

<p align="center"><strong>Meshly</strong> · All your storage. One workspace.</p>

<p align="center"><img src="docs/assets/meshly-banner.svg" alt="Meshly — all your storage, one workspace" width="100%"></p>

<p align="center"><strong>One organized workspace across the cloud storage you already own.</strong></p>

<p align="center">Google Drives · Other Clouds · encrypted managed files · resumable transfers · integrity · recovery · sharing</p>

---

## What is Meshly?

Meshly gives you a familiar Drive-style workspace across connected storage accounts without pretending every provider works the same way.

- **Google Drives** — connect multiple Google accounts, see their capacity together, browse indexed content, and choose where new Meshly-managed files are stored.
- **Other Clouds** — a provider layer for Dropbox, TeraBox, MEGA and future services. Features are enabled only when that provider's supported integration path is implemented and verified.
- **One logical workspace** — folders, search, recent items, starred files, trash, previews, downloads, sharing, activity, integrity and recovery stay organized in Meshly even though physical storage belongs to different accounts/providers.

A Meshly-managed Google file stays **whole inside one healthy Google account**. Google cross-account file sharding is intentionally disabled.

## What is implemented?

### Workspace

- responsive Drive-style file and folder browser;
- file and folder uploads;
- Auto choose or explicit Google-account upload destination;
- nested folders and breadcrumbs;
- list/grid views with saved default preference;
- comfortable/compact density preference;
- search, Recent, Starred and Trash;
- type filters and sorting by name, modified date or size;
- bulk select, star, trash, restore and permanent delete;
- rename and move;
- preview and ranged download;
- file details and SHA-256 information;
- secure share links with optional password, expiry and download limit;
- share management and revocation;
- transfer/activity history;
- dedicated download history;
- workspace analytics;
- notifications, settings, diagnostics, Help and About pages;
- responsive light/dark/system themes.

### Storage safety

> **Every new Meshly-managed file uses the versioned encrypted storage format. There is no plaintext-storage switch.**

Encryption v1 uses framed AES-256-GCM with a fresh random 256-bit file key. The file key is wrapped before persistence; plaintext file keys are not stored in PostgreSQL or recovery manifests.

Meshly separately tracks logical plaintext SHA-256, ciphertext SHA-256 and encrypted physical size. A managed file is not exposed as ready until its required remote encrypted object has been verified.

The current design is **backend-trusted encryption**, not zero-knowledge encryption. The authenticated planning path can access the file key during the upload flow.

### Transfers

- encrypted Google resumable uploads;
- provider offset reconciliation after transient failures;
- retry/backoff with encrypted-frame boundary validation;
- abort cleanup for failed uploads;
- HTTP Range-aware encrypted downloads;
- remote-object verification before a logical file becomes ready;
- provider-aware transfer profiles instead of one global concurrency setting;
- dedicated ciphertext-only TeraBox large-file worker path, kept activation-gated until deployed live verification passes.

### Account and file health

- Google quota refresh and capacity reporting;
- account health/pause controls;
- Managed Google OAuth mode;
- optional Full Drive read/index mode for pre-existing Google content;
- integrity scanning;
- signed recovery snapshots;
- logical-index restore;
- health/readiness and production preflight tooling.

## Provider status

| Area | Provider | Current state | Managed upload state |
| --- | --- | --- | --- |
| Google Drives | Google Drive | Core provider implemented | Encrypted whole-file resumable path implemented |
| Other Clouds | Dropbox | Official OAuth, quota/browse and encrypted-transfer foundation implemented | Activation-gated pending live provider round-trip verification |
| Other Clouds | TeraBox | Official Open Platform quota/browse, encrypted small-file path and dedicated large-file worker code implemented | Both managed-upload paths remain activation-gated pending deployed live provider round-trip verification |
| Other Clouds | MEGA | Provider capability/worker gate defined | Official SDK-backed worker remains pending |
| Other Clouds | MediaFire | Experimental only | Disabled until a suitable supported production integration is verified |

A provider being connected or browsable does **not** mean managed uploads are automatically enabled. Unverified upload paths fail closed.

Multipart **transport** is also different from persistent distributed storage: using several transfer parts does not mean Meshly may persist one logical file across unrelated provider objects/accounts.

The TeraBox large-file worker is documented in [`workers/terabox/README.md`](workers/terabox/README.md). Its browser-facing capability contains object/size/frame bindings only; provider credentials remain on the trusted server side.

## Encryption and download flow

```text
Browser file
   │
   ├─ hash plaintext
   ├─ encrypt authenticated frames
   ▼
Provider upload session
   │
   ├─ retry / resume when allowed
   ├─ verify remote encrypted object
   ▼
Meshly logical file = ready

Download request
   │
   ├─ map requested plaintext range to encrypted frames
   ├─ fetch required remote bytes
   ├─ authenticate + decrypt
   ▼
HTTP response / Range response
```

Legacy managed files created before encryption v1 and externally indexed Google Drive content remain readable for compatibility.

## Architecture

```text
                              Meshly Core
                                   │
                 ┌─────────────────┴─────────────────┐
                 │                                   │
           Google Drives                        Other Clouds
                 │                                   │
          Google adapter                    Provider adapters
                                                     │
                                        ┌────────────┼────────────┐
                                        │            │            │
                                     Dropbox      TeraBox       MEGA
                 └───────────────────────┬─────────────────────────┘
                                         │
                              Provider-aware transfer
                                         │
                                Encryption format v1
                                         │
                               Integrity + recovery
```

Provider, transfer, encryption and recovery logic stays outside the React UI so future desktop/mobile clients can reuse the same storage rules.

Read [`ARCHITECTURE.md`](ARCHITECTURE.md) for the detailed invariants.

## Useful screens

| Screen | What it is for |
| --- | --- |
| `/drive` | Main unified file workspace |
| `/accounts` | Google account health, quota and Full Drive indexing controls |
| `/clouds` | Other provider connections/capabilities |
| `/transfers` | Transfer-related activity |
| `/downloads` | Recorded authenticated download history |
| `/shared` | Active/revoked share links and download counts |
| `/integrity` | File/object integrity status |
| `/recovery` | Recovery snapshots and index restore |
| `/analytics` | Workspace, storage, transfer and sharing overview |
| `/diagnostics` | Runtime/configuration health |
| `/settings/general` | View, density, theme, storage, transfer and security preferences |
| `/help` | Current product behavior and safety model |

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

Managed mode requests OpenID profile/email plus the narrower Drive permissions used for Meshly-managed content and app data. Full Drive mode is optional and should only be exposed publicly after the deployment satisfies applicable requirements for the broader read scope.

See [`DEPLOYMENT.md`](DEPLOYMENT.md). Public deployment also exposes `/privacy` and `/terms` for product/OAuth transparency.

## Verification

Every pull request and push to `main` runs the release gate:

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

Passing CI verifies the repository code gate. Credential-dependent OAuth, cloud-provider and production-runtime flows are tracked separately and are only marked live-verified after they are exercised against the real configured provider/deployment.

## Security

Read [`SECURITY.md`](SECURITY.md) before deployment.

Important rules:

- refresh/provider credentials stay server-side and encrypted at rest where applicable;
- plaintext file keys, OAuth refresh tokens and resumable-session secrets must never enter recovery manifests or logs;
- Google managed uploads stay whole-file-only;
- no logical managed file becomes ready before its physical encrypted object verifies;
- provider limits, terms, quotas and rate limits must be respected;
- Dropbox/TeraBox managed-upload gates stay off until provider-specific live verification passes.

## Remaining integration work

The codebase is intentionally explicit about work that cannot be truthfully called production-verified yet:

1. deploy the current merged schema/runtime after the Vercel build-rate window allows a new production deployment;
2. verify production migration `0008` and Google quota schema v2;
3. complete real Google existing-file/quota browser verification after explicit user OAuth consent;
4. run encrypted Google Auto and explicitly selected-account SHA-256 round trips;
5. live-verify Dropbox and TeraBox provider transfers with credentials configured outside the repository/chat;
6. deploy and live-verify the TeraBox large-file worker, including multi-frame encrypted upload/download/integrity/delete/abort behavior, before enabling its production gate;
7. finish the official SDK-backed MEGA worker;
8. run deployed integrity, recovery, sharing and maintenance smoke tests.

None of these pending live/provider steps are silently treated as complete.

## Durable continuation

Meshly keeps project state in the repository so another coding agent can continue without relying on chat memory.

Read in this order:

- `AGENTS.md`
- `HANDOFF.md`
- `NEXT_ACTION.md`
- `CHECKPOINT.md`
- `.meshly/project-state.json`
- `.meshly/current-task.json`
- `.meshly/resume-state.json`
- newest file in `docs/checkpoints/`

Repository/PR/CI history newer than a checkpoint always wins.

---

<p align="center"><strong>Meshly</strong> · All your storage. One workspace.</p>

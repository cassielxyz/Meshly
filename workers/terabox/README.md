# Meshly TeraBox transfer worker

This worker is the dedicated large-file transport for TeraBox-managed Meshly objects. It exists so the Next.js/serverless application does not proxy large encrypted request bodies.

## Security model

- The browser encrypts each Meshly frame before sending ciphertext to this worker.
- Encryption-frame boundaries and provider transport-part boundaries are deliberately independent. Meshly repacks the contiguous ciphertext stream into deterministic TeraBox-safe transport parts without decrypting or changing the encrypted bytes.
- For multipart TeraBox uploads, Meshly plans every transport fragment above 4 MiB, including the final fragment, to satisfy the provider multipart requirement.
- The worker receives ciphertext only; it never receives the plaintext file key.
- A short-lived HMAC capability binds an upload to one Meshly object, user, file, ciphertext size and provider transport-part layout.
- TeraBox provider credentials remain inside the Meshly backend. The worker receives temporary provider part URLs only over its authenticated internal app-to-worker flow.
- Temporary ciphertext is deleted after a successful provider commit and on an explicit abort.
- `TERABOX_LARGE_WORKER_ENABLED` and `TERABOX_MANAGED_UPLOADS_ENABLED` remain fail-closed activation gates.

## Required worker environment

```text
MESHLY_APP_ORIGIN=https://your-meshly-domain.example
MESHLY_INTERNAL_BASE_URL=https://your-meshly-domain.example
TERABOX_WORKER_SIGNING_KEY=<32+ random characters>
TERABOX_WORKER_INTERNAL_SECRET=<different 32+ random characters>
```

Optional:

```text
PORT=8080
TERABOX_WORKER_TEMP_DIR=/tmp/meshly-terabox
TERABOX_PROVIDER_TIMEOUT_MS=120000
MESHLY_INTERNAL_TIMEOUT_MS=30000
```

The Meshly application must use the same signing/internal secrets plus:

```text
TERABOX_WORKER_URL=https://your-worker.example
TERABOX_LARGE_WORKER_ENABLED=false
```

Keep the feature flag **false** until the deployed worker has passed the live verification steps below.

## Container build

From the repository root:

```bash
docker build -f workers/terabox/Dockerfile -t meshly-terabox-worker .
```

The worker has no third-party runtime dependencies; it uses Node.js 22 built-ins and the platform `fetch`, `FormData` and `Blob` APIs.

## Runtime storage

The worker must be able to spool the complete encrypted object temporarily because TeraBox precreate needs the ordered MD5 list for all provider transport parts before provider upload begins.

Provision enough ephemeral or persistent scratch disk for the largest permitted encrypted upload plus operational headroom. The directory must not be shared publicly. A worker restart can discard an unfinished spool; the browser can then restart that upload under a new capability.

## Health check

```text
GET /health
```

Expected response:

```json
{"ok":true,"service":"meshly-terabox-worker"}
```

## Activation checklist

1. Deploy the worker over HTTPS.
2. Configure the exact Meshly app origin and the two independent worker secrets on both sides.
3. Configure `TERABOX_WORKER_URL` in the Meshly application while leaving `TERABOX_LARGE_WORKER_ENABLED=false`.
4. Verify the worker health endpoint and internal connectivity.
5. Using real TeraBox application credentials outside the repository/chat, perform an encrypted large-file upload that uses multiple provider transport parts, including a source size that would otherwise produce a short final encryption frame.
6. Confirm every multipart provider fragment is greater than 4 MiB, then verify provider object size, final Meshly plaintext SHA-256, ciphertext SHA-256, download reconstruction, HTTP range behavior, integrity scan and delete cleanup.
7. Verify interrupted/aborted uploads remove temporary worker ciphertext and do not expose a ready logical file.
8. Only after those checks pass, set `TERABOX_LARGE_WORKER_ENABLED=true` in production.

Until live provider verification is complete, the code path is implemented but intentionally not considered production-verified.

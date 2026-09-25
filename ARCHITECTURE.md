# Meshly architecture

Meshly is a virtual filesystem layered over multiple user-authorized Google Drive accounts. The UI presents one logical namespace while the storage engine owns placement, chunk manifests, reconstruction and account health.

## Invariants

1. **Whole-file first.** A file remains one physical object when a healthy account has enough capacity after its reserve.
2. **Split only when required.** The planner creates deterministic byte ranges across storage nodes when no single node can safely hold the file.
3. **No silent corruption.** Every physical part and every logical file carries a SHA-256 checksum.
4. **Commit after verification.** An upload is not `ready` until each Google Drive object exists with the expected byte length.
5. **Streaming retrieval.** Download reconstruction streams ranges from Drive in order instead of buffering the complete file on the Meshly server.
6. **Account boundaries stay implementation details.** Normal file navigation uses logical paths and IDs.

## Upload flow

Browser → `/api/uploads/plan` → placement engine → refresh per-account credentials → Drive resumable sessions → browser uploads byte ranges directly → `/api/uploads/commit` → remote-size verification → logical file becomes ready.

## Download flow

Browser → `/api/files/:id/download` → validate session and logical ownership → resolve chunk/account map → translate optional HTTP Range to physical chunk ranges → stream Drive responses sequentially.

## OAuth modes

- **Managed mode (default):** `drive.file`; Meshly controls files it creates and items explicitly opened with the app.
- **Full mode (optional):** broader Drive access for indexing an existing Drive. This must be treated as an advanced mode because Google classifies broad Drive scopes more strictly and public deployments may require additional verification.

## Metadata and recovery

PostgreSQL is the primary logical index. The next recovery milestone stores a compact signed manifest copy in each account's Drive application data so a lost database can be reconstructed from connected storage nodes.

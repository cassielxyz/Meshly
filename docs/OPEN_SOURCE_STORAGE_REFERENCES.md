# Open-source storage references

Meshly studies established open-source storage projects to avoid reinventing transfer and provider abstractions. These repositories are currently used as **design references only** unless a future change explicitly records compatible code reuse and its license obligations.

## rclone

Reference areas:

- provider/backend abstraction;
- resumable transfer patterns;
- throttling and retry behavior;
- `crypt`-style encrypted remote objects;
- `chunker` distinction between logical files and physical parts;
- `combine` concepts for presenting multiple remotes through one interface.

Meshly does not copy rclone's Go implementation into the TypeScript codebase. The useful concepts are reimplemented behind Meshly's own provider contract.

## Cloudreve

Reference areas:

- browser/client transfer architecture;
- provider-specific upload policies;
- resumable uploads;
- configurable concurrency;
- preparing work locally while a provider queue is constrained.

## OpenList / AList

Reference areas:

- provider-driver boundaries;
- TeraBox behavior and operational edge cases;
- directory/file capability modeling.

Unofficial browser-cookie/session authentication patterns from third-party drivers are not a production authentication strategy for Meshly. Prefer the provider's supported OAuth/API flow where available.

## TeraBox uploader implementations

Reference areas:

- pre-create → part upload → finalize sequencing;
- upload IDs and part numbering;
- provider-required hashes;
- sequential queue behavior and retries.

These projects are protocol/behavior references, not a reason to bypass TeraBox account limits, advertisements, paid features or supported authentication requirements.

## Rules for using references

1. Check the upstream license before copying any code.
2. Prefer concepts and clean-room reimplementation over copying implementation details.
3. Prefer official provider APIs/SDKs for production.
4. Do not depend on scraped private endpoints when a supported API exists.
5. Do not implement limit bypasses or cross-account circumvention.
6. Add provider-specific tests before enabling an adapter.
7. Keep Meshly encryption, integrity and recovery invariants above the provider layer.

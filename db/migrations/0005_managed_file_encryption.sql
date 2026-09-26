ALTER TABLE logical_files
  ADD COLUMN IF NOT EXISTS encryption_version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wrapped_file_key text,
  ADD COLUMN IF NOT EXISTS encryption_nonce_prefix text,
  ADD COLUMN IF NOT EXISTS encryption_frame_plain_bytes integer;

ALTER TABLE chunks
  ADD COLUMN IF NOT EXISTS physical_size bigint,
  ADD COLUMN IF NOT EXISTS ciphertext_sha256 text;

CREATE INDEX IF NOT EXISTS logical_files_encryption_version_idx ON logical_files(encryption_version);

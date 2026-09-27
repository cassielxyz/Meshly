CREATE TABLE IF NOT EXISTS provider_objects (
  id text PRIMARY KEY,
  file_id text NOT NULL REFERENCES logical_files(id) ON DELETE CASCADE,
  provider_account_id text NOT NULL REFERENCES provider_accounts(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  physical_name text NOT NULL,
  remote_id text,
  remote_path text,
  logical_size bigint NOT NULL,
  physical_size bigint NOT NULL,
  ciphertext_sha256 text,
  upload_session_encrypted text,
  uploaded_bytes bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'uploading',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_objects_file_idx
  ON provider_objects(file_id);
CREATE INDEX IF NOT EXISTS provider_objects_account_status_idx
  ON provider_objects(provider_account_id, status);

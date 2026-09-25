ALTER TABLE logical_files ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'managed';
ALTER TABLE logical_files ADD COLUMN IF NOT EXISTS source_account_id text REFERENCES linked_accounts(id) ON DELETE SET NULL;
ALTER TABLE logical_files ADD COLUMN IF NOT EXISTS source_drive_file_id text;
ALTER TABLE logical_files ADD COLUMN IF NOT EXISTS source_mime_type text;
ALTER TABLE logical_files ADD COLUMN IF NOT EXISTS source_web_view_link text;
CREATE UNIQUE INDEX IF NOT EXISTS logical_files_source_idx ON logical_files(source_account_id, source_drive_file_id);

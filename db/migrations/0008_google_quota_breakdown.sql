ALTER TABLE linked_accounts
  ADD COLUMN IF NOT EXISTS quota_usage_in_drive bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quota_usage_in_drive_trash bigint NOT NULL DEFAULT 0;

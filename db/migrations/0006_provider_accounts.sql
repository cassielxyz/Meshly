CREATE TABLE IF NOT EXISTS provider_accounts (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_account_id text NOT NULL,
  email text,
  name text,
  avatar_url text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  quota_limit bigint NOT NULL DEFAULT 0,
  quota_usage bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'healthy',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_accounts_provider_external_idx
  ON provider_accounts(provider, external_account_id);
CREATE INDEX IF NOT EXISTS provider_accounts_user_provider_idx
  ON provider_accounts(user_id, provider);

CREATE TABLE IF NOT EXISTS share_auth_attempts (
  key text PRIMARY KEY,
  share_id text NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
  attempts integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS share_auth_attempts_share_idx ON share_auth_attempts(share_id);

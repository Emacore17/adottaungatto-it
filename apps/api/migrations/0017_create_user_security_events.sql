CREATE TABLE IF NOT EXISTS user_security_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NULL REFERENCES app_users (id) ON DELETE SET NULL,
  event_type VARCHAR(64) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip INET NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_security_events_user_id
  ON user_security_events (user_id);

CREATE INDEX IF NOT EXISTS idx_user_security_events_event_type_created_at_desc
  ON user_security_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_security_events_created_at_desc
  ON user_security_events (created_at DESC);

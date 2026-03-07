CREATE TABLE IF NOT EXISTS user_consents (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  consent_type VARCHAR(32) NOT NULL,
  consent_version VARCHAR(64) NOT NULL,
  granted BOOLEAN NOT NULL,
  source VARCHAR(64) NOT NULL DEFAULT 'account_settings',
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_consents_type_check CHECK (
    consent_type IN ('privacy', 'terms', 'marketing')
  )
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_type_created_desc
  ON user_consents (user_id, consent_type, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_created_desc
  ON user_consents (user_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS user_linked_identities (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  provider VARCHAR(64) NOT NULL,
  provider_subject VARCHAR(255) NOT NULL,
  email_at_link VARCHAR(320),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_linked_identities_provider_subject_unique UNIQUE (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_user_linked_identities_user_last_seen
  ON user_linked_identities (user_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_linked_identities_provider
  ON user_linked_identities (provider, provider_subject);

INSERT INTO user_linked_identities (user_id, provider, provider_subject, email_at_link)
SELECT
  u.id,
  u.provider,
  u.provider_subject,
  u.email
FROM app_users u
ON CONFLICT (provider, provider_subject)
DO UPDATE SET
  user_id = EXCLUDED.user_id,
  email_at_link = EXCLUDED.email_at_link,
  last_seen_at = NOW();

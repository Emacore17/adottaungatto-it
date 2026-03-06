ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS user_phone_verification_challenges (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  phone_e164 VARCHAR(20) NOT NULL,
  code_hash VARCHAR(128) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_phone_verification_challenges_user_phone_unique UNIQUE (user_id, phone_e164)
);

CREATE INDEX IF NOT EXISTS idx_user_phone_verification_challenges_user_id
  ON user_phone_verification_challenges (user_id);

CREATE INDEX IF NOT EXISTS idx_user_phone_verification_challenges_expires_at
  ON user_phone_verification_challenges (expires_at);

DROP TRIGGER IF EXISTS trg_user_phone_verification_challenges_updated_at
  ON user_phone_verification_challenges;
CREATE TRIGGER trg_user_phone_verification_challenges_updated_at
BEFORE UPDATE ON user_phone_verification_challenges
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

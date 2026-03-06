CREATE TABLE IF NOT EXISTS user_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES app_users (id) ON DELETE CASCADE,
  first_name VARCHAR(80),
  last_name VARCHAR(80),
  display_name VARCHAR(120),
  phone_e164 VARCHAR(20),
  city VARCHAR(120),
  province VARCHAR(120),
  bio VARCHAR(800),
  avatar_storage_key VARCHAR(512),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

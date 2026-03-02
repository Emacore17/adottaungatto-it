DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_participant_role') THEN
    CREATE TYPE message_participant_role AS ENUM (
      'owner',
      'requester'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS message_threads (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES listings (id) ON DELETE RESTRICT,
  owner_user_id BIGINT NOT NULL REFERENCES app_users (id) ON DELETE RESTRICT,
  requester_user_id BIGINT NOT NULL REFERENCES app_users (id) ON DELETE RESTRICT,
  listing_title_snapshot VARCHAR(160) NOT NULL,
  source VARCHAR(60) NOT NULL DEFAULT 'web_listing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latest_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT message_threads_owner_requester_distinct CHECK (owner_user_id <> requester_user_id),
  CONSTRAINT message_threads_unique_listing_pair UNIQUE (listing_id, owner_user_id, requester_user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_threads_listing_id ON message_threads (listing_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_owner_latest_message_at_desc
  ON message_threads (owner_user_id, latest_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_threads_requester_latest_message_at_desc
  ON message_threads (requester_user_id, latest_message_at DESC);

DROP TRIGGER IF EXISTS trg_message_threads_updated_at ON message_threads;
CREATE TRIGGER trg_message_threads_updated_at
BEFORE UPDATE ON message_threads
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TABLE IF NOT EXISTS message_thread_participants (
  thread_id BIGINT NOT NULL REFERENCES message_threads (id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  role message_participant_role NOT NULL,
  last_read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id),
  CONSTRAINT message_thread_participants_unique_role UNIQUE (thread_id, role)
);

CREATE INDEX IF NOT EXISTS idx_message_thread_participants_user_id
  ON message_thread_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_message_thread_participants_user_archived_at
  ON message_thread_participants (user_id, archived_at);

DROP TRIGGER IF EXISTS trg_message_thread_participants_updated_at ON message_thread_participants;
CREATE TRIGGER trg_message_thread_participants_updated_at
BEFORE UPDATE ON message_thread_participants
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TABLE IF NOT EXISTS message_messages (
  id BIGSERIAL PRIMARY KEY,
  thread_id BIGINT NOT NULL REFERENCES message_threads (id) ON DELETE CASCADE,
  sender_user_id BIGINT NOT NULL REFERENCES app_users (id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  message_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT message_messages_body_not_empty CHECK (char_length(btrim(body)) > 0),
  CONSTRAINT message_messages_body_max_length CHECK (char_length(body) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_message_messages_thread_id_id_desc
  ON message_messages (thread_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_message_messages_sender_user_id_created_at_desc
  ON message_messages (sender_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_messages_thread_sender_created_at_desc
  ON message_messages (thread_id, sender_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_messages_thread_sender_hash_created_at_desc
  ON message_messages (thread_id, sender_user_id, message_hash, created_at DESC);

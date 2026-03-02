ALTER TABLE message_threads
  ADD COLUMN IF NOT EXISTS latest_message_id BIGINT REFERENCES message_messages (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS latest_message_preview VARCHAR(180),
  ADD COLUMN IF NOT EXISTS latest_message_sender_user_id BIGINT REFERENCES app_users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS messages_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by_user_id BIGINT REFERENCES app_users (id) ON DELETE SET NULL;

ALTER TABLE message_thread_participants
  ADD COLUMN IF NOT EXISTS unread_count INTEGER NOT NULL DEFAULT 0;

WITH message_counts AS (
  SELECT
    thread_id,
    COUNT(*)::integer AS message_count
  FROM message_messages
  GROUP BY thread_id
),
latest_messages AS (
  SELECT DISTINCT ON (message.thread_id)
    message.thread_id,
    message.id,
    message.sender_user_id,
    message.created_at,
    CASE
      WHEN char_length(REGEXP_REPLACE(BTRIM(message.body), '\s+', ' ', 'g')) <= 180
        THEN REGEXP_REPLACE(BTRIM(message.body), '\s+', ' ', 'g')
      ELSE CONCAT(SUBSTRING(REGEXP_REPLACE(BTRIM(message.body), '\s+', ' ', 'g') FROM 1 FOR 177), '...')
    END AS preview
  FROM message_messages message
  ORDER BY message.thread_id, message.id DESC
)
UPDATE message_threads thread
SET
  latest_message_id = latest.id,
  latest_message_preview = latest.preview,
  latest_message_sender_user_id = latest.sender_user_id,
  latest_message_at = COALESCE(latest.created_at, thread.latest_message_at),
  messages_count = COALESCE(counts.message_count, 0)
FROM message_counts counts
LEFT JOIN latest_messages latest ON latest.thread_id = counts.thread_id
WHERE thread.id = counts.thread_id;

UPDATE message_threads
SET messages_count = 0
WHERE messages_count IS NULL;

WITH unread_by_participant AS (
  SELECT
    participant.thread_id,
    participant.user_id,
    COUNT(message.id)::integer AS unread_count
  FROM message_thread_participants participant
  LEFT JOIN message_messages message
    ON message.thread_id = participant.thread_id
   AND message.sender_user_id <> participant.user_id
   AND (
     participant.last_read_at IS NULL
     OR message.created_at > participant.last_read_at
   )
  GROUP BY participant.thread_id, participant.user_id
)
UPDATE message_thread_participants participant
SET unread_count = unread.unread_count
FROM unread_by_participant unread
WHERE participant.thread_id = unread.thread_id
  AND participant.user_id = unread.user_id;

CREATE INDEX IF NOT EXISTS idx_message_threads_owner_visible_latest_message_at_desc
  ON message_threads (owner_user_id, latest_message_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_threads_requester_visible_latest_message_at_desc
  ON message_threads (requester_user_id, latest_message_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_threads_deleted_at
  ON message_threads (deleted_at);

CREATE INDEX IF NOT EXISTS idx_message_thread_participants_user_archived_unread
  ON message_thread_participants (user_id, archived_at, unread_count);

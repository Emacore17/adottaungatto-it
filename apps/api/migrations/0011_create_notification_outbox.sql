DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_outbox_status') THEN
    CREATE TYPE notification_outbox_status AS ENUM (
      'pending',
      'processing',
      'sent',
      'failed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS notification_outbox (
  id BIGSERIAL PRIMARY KEY,
  channel VARCHAR(32) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  dedupe_key VARCHAR(255) NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  status notification_outbox_status NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 8,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ NULL,
  sent_at TIMESTAMPTZ NULL,
  failed_at TIMESTAMPTZ NULL,
  last_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_outbox_attempt_count_non_negative CHECK (attempt_count >= 0),
  CONSTRAINT notification_outbox_max_attempts_positive CHECK (max_attempts >= 1)
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_status_available_at
  ON notification_outbox (status, available_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_event_type_status
  ON notification_outbox (event_type, status, available_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_processing_started_at
  ON notification_outbox (processing_started_at)
  WHERE status = 'processing';

DROP TRIGGER IF EXISTS trg_notification_outbox_updated_at ON notification_outbox;
CREATE TRIGGER trg_notification_outbox_updated_at
BEFORE UPDATE ON notification_outbox
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

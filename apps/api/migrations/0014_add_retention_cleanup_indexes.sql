CREATE INDEX IF NOT EXISTS idx_notification_outbox_sent_at_id
  ON notification_outbox (sent_at ASC, id ASC)
  WHERE status = 'sent'::notification_outbox_status
    AND sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_outbox_failed_at_id
  ON notification_outbox (failed_at ASC, id ASC)
  WHERE status = 'failed'::notification_outbox_status
    AND failed_at IS NOT NULL;

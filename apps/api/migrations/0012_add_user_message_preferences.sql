ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS message_email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_app_users_message_email_notifications_enabled
  ON app_users (message_email_notifications_enabled);

CREATE TABLE IF NOT EXISTS listing_contact_requests (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  sender_name VARCHAR(120) NOT NULL,
  sender_email VARCHAR(320) NOT NULL,
  sender_phone VARCHAR(40),
  message TEXT NOT NULL,
  message_hash CHAR(64) NOT NULL,
  source VARCHAR(60) NOT NULL DEFAULT 'web_public_form',
  sender_ip VARCHAR(64),
  user_agent VARCHAR(400),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_contact_requests_listing_id
  ON listing_contact_requests (listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_contact_requests_created_at_desc
  ON listing_contact_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_contact_requests_sender_ip_created_at_desc
  ON listing_contact_requests (sender_ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_contact_requests_listing_sender_email_hash_created_at_desc
  ON listing_contact_requests (listing_id, lower(sender_email), message_hash, created_at DESC);

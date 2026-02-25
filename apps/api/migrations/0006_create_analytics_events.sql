DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analytics_event_type') THEN
    CREATE TYPE analytics_event_type AS ENUM (
      'listing_view',
      'search_performed',
      'search_fallback_applied',
      'contact_clicked',
      'contact_sent',
      'listing_created',
      'listing_published'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type analytics_event_type NOT NULL,
  actor_user_id BIGINT REFERENCES app_users (id) ON DELETE SET NULL,
  listing_id BIGINT REFERENCES listings (id) ON DELETE SET NULL,
  source VARCHAR(60) NOT NULL DEFAULT 'api',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at_desc ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_listing_id ON analytics_events (listing_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_actor_user_id ON analytics_events (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type_created_at_desc
  ON analytics_events (event_type, created_at DESC);

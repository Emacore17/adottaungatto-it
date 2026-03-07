CREATE TABLE IF NOT EXISTS user_favorite_listings (
  user_id BIGINT NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  listing_id BIGINT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_favorite_listings_pkey PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorite_listings_user_created_desc
  ON user_favorite_listings (user_id, created_at DESC, listing_id DESC);

CREATE INDEX IF NOT EXISTS idx_user_favorite_listings_listing_id
  ON user_favorite_listings (listing_id);

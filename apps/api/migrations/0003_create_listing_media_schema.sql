CREATE TABLE IF NOT EXISTS listing_media (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  mime_type VARCHAR(120) NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size >= 0),
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  hash VARCHAR(128),
  position INTEGER NOT NULL CHECK (position > 0),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT listing_media_listing_position_unique UNIQUE (listing_id, position)
);

CREATE INDEX IF NOT EXISTS idx_listing_media_listing_id ON listing_media (listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_media_listing_order ON listing_media (listing_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_media_single_primary ON listing_media (listing_id) WHERE is_primary;

DROP TRIGGER IF EXISTS trg_listing_media_updated_at ON listing_media;
CREATE TRIGGER trg_listing_media_updated_at
BEFORE UPDATE ON listing_media
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

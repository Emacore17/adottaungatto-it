CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_listings_published_not_deleted_id
  ON listings (id ASC)
  WHERE status = 'published'::listing_status
    AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_published_not_deleted_newest
  ON listings ((COALESCE(published_at, created_at)) DESC, id DESC)
  WHERE status = 'published'::listing_status
    AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_published_not_deleted_price
  ON listings (price_amount ASC NULLS LAST, id DESC)
  WHERE status = 'published'::listing_status
    AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_published_text_tsv
  ON listings
  USING GIN (to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(description, '')))
  WHERE status = 'published'::listing_status
    AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_published_title_trgm
  ON listings
  USING GIN (title gin_trgm_ops)
  WHERE status = 'published'::listing_status
    AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_published_description_trgm
  ON listings
  USING GIN (description gin_trgm_ops)
  WHERE status = 'published'::listing_status
    AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_published_age_text_trgm
  ON listings
  USING GIN (age_text gin_trgm_ops)
  WHERE status = 'published'::listing_status
    AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_published_breed_trgm
  ON listings
  USING GIN ((COALESCE(breed, '')) gin_trgm_ops)
  WHERE status = 'published'::listing_status
    AND deleted_at IS NULL;

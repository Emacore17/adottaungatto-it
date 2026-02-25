DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN
    CREATE TYPE listing_status AS ENUM (
      'draft',
      'pending_review',
      'published',
      'rejected',
      'suspended',
      'archived'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  provider VARCHAR(32) NOT NULL,
  provider_subject VARCHAR(255) NOT NULL,
  email VARCHAR(320) NOT NULL,
  roles JSONB NOT NULL DEFAULT '["user"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT app_users_provider_subject_unique UNIQUE (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users (email);

DROP TRIGGER IF EXISTS trg_app_users_updated_at ON app_users;
CREATE TRIGGER trg_app_users_updated_at
BEFORE UPDATE ON app_users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TABLE IF NOT EXISTS listings (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT NOT NULL REFERENCES app_users (id) ON DELETE RESTRICT,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  listing_type VARCHAR(40) NOT NULL,
  price_amount NUMERIC(10, 2),
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  age_text VARCHAR(80) NOT NULL,
  sex VARCHAR(20) NOT NULL,
  breed VARCHAR(120),
  status listing_status NOT NULL DEFAULT 'pending_review',
  region_id BIGINT NOT NULL REFERENCES regions (id) ON DELETE RESTRICT,
  province_id BIGINT NOT NULL REFERENCES provinces (id) ON DELETE RESTRICT,
  comune_id BIGINT NOT NULL REFERENCES comuni (id) ON DELETE RESTRICT,
  contact_name VARCHAR(120),
  contact_phone VARCHAR(40),
  contact_email VARCHAR(320),
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT listings_price_amount_non_negative CHECK (price_amount IS NULL OR price_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_listings_owner_user_id ON listings (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at_desc ON listings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_published_at_desc ON listings (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_region_id ON listings (region_id);
CREATE INDEX IF NOT EXISTS idx_listings_province_id ON listings (province_id);
CREATE INDEX IF NOT EXISTS idx_listings_comune_id ON listings (comune_id);
CREATE INDEX IF NOT EXISTS idx_listings_owner_status ON listings (owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_visible_scope ON listings (status, region_id, province_id, comune_id);

DROP TRIGGER IF EXISTS trg_listings_updated_at ON listings;
CREATE TRIGGER trg_listings_updated_at
BEFORE UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

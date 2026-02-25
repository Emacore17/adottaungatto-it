DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_boost_type') THEN
    CREATE TYPE promotion_boost_type AS ENUM (
      'boost_24h',
      'boost_7d',
      'boost_30d'
    );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_status') THEN
    CREATE TYPE promotion_status AS ENUM (
      'scheduled',
      'active',
      'expired',
      'cancelled'
    );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_event_type') THEN
    CREATE TYPE promotion_event_type AS ENUM (
      'created',
      'activated',
      'expired',
      'cancelled'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS plans (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(140) NOT NULL,
  description TEXT,
  boost_type promotion_boost_type NOT NULL,
  duration_hours INTEGER NOT NULL CHECK (duration_hours > 0),
  promotion_weight NUMERIC(6, 3) NOT NULL DEFAULT 1.000 CHECK (promotion_weight >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans (is_active);
CREATE INDEX IF NOT EXISTS idx_plans_boost_type ON plans (boost_type);

DROP TRIGGER IF EXISTS trg_plans_updated_at ON plans;
CREATE TRIGGER trg_plans_updated_at
BEFORE UPDATE ON plans
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TABLE IF NOT EXISTS listing_promotions (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  plan_id BIGINT NOT NULL REFERENCES plans (id) ON DELETE RESTRICT,
  created_by_user_id BIGINT REFERENCES app_users (id) ON DELETE SET NULL,
  status promotion_status NOT NULL DEFAULT 'scheduled',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  activated_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT listing_promotions_window_valid CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_listing_promotions_listing_id ON listing_promotions (listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_promotions_plan_id ON listing_promotions (plan_id);
CREATE INDEX IF NOT EXISTS idx_listing_promotions_status ON listing_promotions (status);
CREATE INDEX IF NOT EXISTS idx_listing_promotions_window ON listing_promotions (starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_listing_promotions_created_by ON listing_promotions (created_by_user_id);

DROP TRIGGER IF EXISTS trg_listing_promotions_updated_at ON listing_promotions;
CREATE TRIGGER trg_listing_promotions_updated_at
BEFORE UPDATE ON listing_promotions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TABLE IF NOT EXISTS promotion_events (
  id BIGSERIAL PRIMARY KEY,
  listing_promotion_id BIGINT NOT NULL REFERENCES listing_promotions (id) ON DELETE CASCADE,
  event_type promotion_event_type NOT NULL,
  actor_user_id BIGINT REFERENCES app_users (id) ON DELETE SET NULL,
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotion_events_listing_promotion_id ON promotion_events (listing_promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_events_event_type ON promotion_events (event_type);
CREATE INDEX IF NOT EXISTS idx_promotion_events_event_at_desc ON promotion_events (event_at DESC);

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS regions (
  id BIGSERIAL PRIMARY KEY,
  istat_code VARCHAR(3) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  centroid_lat NUMERIC(9, 6),
  centroid_lng NUMERIC(9, 6),
  geom GEOMETRY(MULTIPOLYGON, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provinces (
  id BIGSERIAL PRIMARY KEY,
  region_id BIGINT NOT NULL REFERENCES regions (id) ON DELETE RESTRICT,
  istat_code VARCHAR(3) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  sigla CHAR(2) NOT NULL UNIQUE,
  centroid_lat NUMERIC(9, 6),
  centroid_lng NUMERIC(9, 6),
  geom GEOMETRY(MULTIPOLYGON, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comuni (
  id BIGSERIAL PRIMARY KEY,
  region_id BIGINT NOT NULL REFERENCES regions (id) ON DELETE RESTRICT,
  province_id BIGINT NOT NULL REFERENCES provinces (id) ON DELETE RESTRICT,
  istat_code VARCHAR(6) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  code_catastale VARCHAR(4),
  centroid_lat NUMERIC(9, 6),
  centroid_lng NUMERIC(9, 6),
  geom GEOMETRY(POINT, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT comuni_province_name_unique UNIQUE (province_id, name)
);

CREATE INDEX IF NOT EXISTS idx_provinces_region_id ON provinces (region_id);
CREATE INDEX IF NOT EXISTS idx_provinces_name ON provinces (name);
CREATE INDEX IF NOT EXISTS idx_comuni_region_id ON comuni (region_id);
CREATE INDEX IF NOT EXISTS idx_comuni_province_id ON comuni (province_id);
CREATE INDEX IF NOT EXISTS idx_comuni_name ON comuni (name);
CREATE INDEX IF NOT EXISTS idx_comuni_code_catastale ON comuni (code_catastale);
CREATE INDEX IF NOT EXISTS idx_regions_name ON regions (name);

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_regions_updated_at ON regions;
CREATE TRIGGER trg_regions_updated_at
BEFORE UPDATE ON regions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_provinces_updated_at ON provinces;
CREATE TRIGGER trg_provinces_updated_at
BEFORE UPDATE ON provinces
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_comuni_updated_at ON comuni;
CREATE TRIGGER trg_comuni_updated_at
BEFORE UPDATE ON comuni
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

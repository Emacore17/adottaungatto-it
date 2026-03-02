CREATE TABLE IF NOT EXISTS cat_breeds (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(80) NOT NULL,
  label VARCHAR(120) NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cat_breeds_slug_unique UNIQUE (slug),
  CONSTRAINT cat_breeds_label_unique UNIQUE (label),
  CONSTRAINT cat_breeds_sort_order_unique UNIQUE (sort_order),
  CONSTRAINT cat_breeds_sort_order_positive CHECK (sort_order > 0)
);

CREATE INDEX IF NOT EXISTS idx_cat_breeds_label ON cat_breeds (label);
CREATE INDEX IF NOT EXISTS idx_cat_breeds_sort_order ON cat_breeds (sort_order);

INSERT INTO cat_breeds (slug, label, sort_order)
VALUES
  ('europeo', 'Europeo', 1),
  ('persiano', 'Persiano', 2),
  ('maine-coon', 'Maine Coon', 3),
  ('siamese', 'Siamese', 4),
  ('ragdoll', 'Ragdoll', 5),
  ('british-shorthair', 'British Shorthair', 6),
  ('bengala', 'Bengala', 7),
  ('sphynx', 'Sphynx', 8)
ON CONFLICT (slug)
DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

DROP TRIGGER IF EXISTS trg_cat_breeds_updated_at ON cat_breeds;
CREATE TRIGGER trg_cat_breeds_updated_at
BEFORE UPDATE ON cat_breeds
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

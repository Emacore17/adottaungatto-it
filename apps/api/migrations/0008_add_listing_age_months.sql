ALTER TABLE listings
ADD COLUMN IF NOT EXISTS age_months INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listings_age_months_valid'
  ) THEN
    ALTER TABLE listings
    ADD CONSTRAINT listings_age_months_valid
    CHECK (age_months IS NULL OR (age_months >= 0 AND age_months <= 480));
  END IF;
END;
$$;

UPDATE listings
SET age_months =
  CASE
    WHEN age_text IS NULL THEN NULL
    WHEN LOWER(age_text) ~ '(\d+\s*(anno|anni)|\d+\s*(mese|mesi))'
      THEN COALESCE((substring(LOWER(age_text) from '(\d+)\s*(anno|anni)'))::integer, 0) * 12
        + COALESCE((substring(LOWER(age_text) from '(\d+)\s*(mese|mesi)'))::integer, 0)
    ELSE NULL
  END
WHERE age_months IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_age_months ON listings (age_months);

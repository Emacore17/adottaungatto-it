ALTER TABLE listings
ADD COLUMN IF NOT EXISTS is_sterilized BOOLEAN,
ADD COLUMN IF NOT EXISTS is_vaccinated BOOLEAN,
ADD COLUMN IF NOT EXISTS has_microchip BOOLEAN,
ADD COLUMN IF NOT EXISTS compatible_with_children BOOLEAN,
ADD COLUMN IF NOT EXISTS compatible_with_other_animals BOOLEAN;

UPDATE listings
SET
  age_months = 1,
  age_text = '1 mese'
WHERE age_months = 0
   OR LOWER(COALESCE(age_text, '')) ~ '^\s*0\s*(mese|mesi|anno|anni)\s*$';

ALTER TABLE listings
DROP CONSTRAINT IF EXISTS listings_age_months_valid;

ALTER TABLE listings
ADD CONSTRAINT listings_age_months_valid
CHECK (age_months IS NULL OR (age_months >= 1 AND age_months <= 480));

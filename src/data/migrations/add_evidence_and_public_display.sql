-- Evidence-required: witness_count; Defamation protection: public_title, public_description
-- Run: psql -U safepulse_user -d safepulse_db -f src/data/migrations/add_evidence_and_public_display.sql

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS witness_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS public_title VARCHAR(255);

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS public_description TEXT;

-- Backfill public_title for existing rows (safe default)
UPDATE incidents
SET public_title = 'Reported ' || incident_type || ' in ' || location || ' — ' || status
WHERE public_title IS NULL;

COMMENT ON COLUMN incidents.witness_count IS 'Number of witnesses; with evidence, supports under_review status';
COMMENT ON COLUMN incidents.public_title IS 'Defamation-safe title for public display (no individual names)';
COMMENT ON COLUMN incidents.public_description IS 'Defamation-safe description for public display';






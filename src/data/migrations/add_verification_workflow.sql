-- Multi-layer verification: AI screening and human review fields; transparency
-- Run: psql -U safepulse_user -d safepulse_db -f src/data/migrations/add_verification_workflow.sql

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS ai_screened_at TIMESTAMP;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS ai_screening_result VARCHAR(20);

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS ai_notes TEXT;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Allow reviewed_by to reference users if desired (optional FK)
-- ALTER TABLE incidents ADD CONSTRAINT fk_incidents_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id);

COMMENT ON COLUMN incidents.ai_screening_result IS 'pending, passed, or flagged';
COMMENT ON COLUMN incidents.reviewed_by IS 'User ID of moderator who set verification status';

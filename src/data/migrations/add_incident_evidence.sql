-- Add optional evidence column to incidents (PNG, SVG, JPG, MP4 uploads)
-- Run: psql -U safepulse_user -d safepulse_db -f src/data/migrations/add_incident_evidence.sql

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN incidents.evidence IS 'Array of { url, file_name?, file_type? } for uploaded evidence (PNG, SVG, JPG, MP4)';

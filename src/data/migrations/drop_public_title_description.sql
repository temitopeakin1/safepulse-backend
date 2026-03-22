-- Revert defamation columns: keep only title and description on incidents.
-- Public scope still derives safe text in API from incident_type, location, status.
-- Run: psql -U safepulse_user -d safepulse_db -f src/data/migrations/drop_public_title_description.sql

ALTER TABLE incidents DROP COLUMN IF EXISTS public_title;
ALTER TABLE incidents DROP COLUMN IF EXISTS public_description;

-- Extend incident status to three categories: unverified, under_review, verified
-- Public list/map/export should filter to status = 'verified' when scope=public
-- Run: psql -U safepulse_user -d safepulse_db -f src/data/migrations/add_incident_status_under_review.sql

ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
ALTER TABLE incidents
  ADD CONSTRAINT incidents_status_check
  CHECK (status IN ('unverified', 'under_review', 'verified'));

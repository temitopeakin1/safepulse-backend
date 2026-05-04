ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
ALTER TABLE incidents
  ADD CONSTRAINT incidents_status_check
  CHECK (status IN ('unverified', 'under_review', 'verified'));

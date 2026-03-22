-- Reporter reputation (trust level, counts, blocking) and crowd witness confirmations
-- Run: psql -U safepulse_user -d safepulse_db -f src/data/migrations/add_reporter_reputation_and_confirmations.sql

-- Reporter profiles: trust level 1=New, 2=Previous valid, 3=Trusted; blocking for false reports
CREATE TABLE IF NOT EXISTS reporter_profiles (
  user_id TEXT PRIMARY KEY,
  reporter_trust_level SMALLINT NOT NULL DEFAULT 1 CHECK (reporter_trust_level IN (1, 2, 3)),
  verified_report_count INTEGER NOT NULL DEFAULT 0,
  rejected_report_count INTEGER NOT NULL DEFAULT 0,
  blocked_from_reporting BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

COMMENT ON TABLE reporter_profiles IS 'Reputation and blocking for incident reporters';
COMMENT ON COLUMN reporter_profiles.reporter_trust_level IS '1=New, 2=Previous valid reports, 3=Trusted citizen reporter';

-- Incident: store reporter trust level at submission; rejection reason for audit
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reporter_trust_level_at_submission SMALLINT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
COMMENT ON COLUMN incidents.rejection_reason IS 'e.g. false_report, evidence_tampering when status set to unverified';

-- Crowd verification: users who confirm they witnessed the incident
CREATE TABLE IF NOT EXISTS incident_witness_confirmations (
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (incident_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_witness_confirmations_incident ON incident_witness_confirmations(incident_id);

COMMENT ON TABLE incident_witness_confirmations IS 'Crowd verification: users who confirmed they witnessed the incident';

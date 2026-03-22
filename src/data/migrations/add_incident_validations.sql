-- NGO and journalist validation layer
-- Run: psql -U safepulse_user -d safepulse_db -f src/data/migrations/add_incident_validations.sql

CREATE TABLE IF NOT EXISTS incident_validations (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  validator_type VARCHAR(50) NOT NULL,
  validator_id TEXT,
  validator_name TEXT,
  validated_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT chk_validator_type CHECK (validator_type IN ('moderator', 'ngo', 'journalist', 'legal_observer'))
);

CREATE INDEX IF NOT EXISTS idx_incident_validations_incident ON incident_validations(incident_id);

COMMENT ON TABLE incident_validations IS 'Trusted organizations and journalists can validate reports';

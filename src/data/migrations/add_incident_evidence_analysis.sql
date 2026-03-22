-- Per-evidence AI analysis results (deepfake/manipulation screening)
-- Run: psql -U safepulse_user -d safepulse_db -f src/data/migrations/add_incident_evidence_analysis.sql

CREATE TABLE IF NOT EXISTS incident_evidence_analysis (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type VARCHAR(20),
  provider VARCHAR(50) NOT NULL DEFAULT 'managed_api',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'error', 'skipped')),
  score NUMERIC(6, 5),
  labels JSONB,
  raw_response JSONB,
  error_message TEXT,
  analyzed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Prevent duplicates if a job is retried
CREATE UNIQUE INDEX IF NOT EXISTS uq_incident_evidence_analysis_incident_file
  ON incident_evidence_analysis(incident_id, file_url);

CREATE INDEX IF NOT EXISTS idx_incident_evidence_analysis_incident_id
  ON incident_evidence_analysis(incident_id);

CREATE INDEX IF NOT EXISTS idx_incident_evidence_analysis_status
  ON incident_evidence_analysis(status);


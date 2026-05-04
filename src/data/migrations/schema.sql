-- Users table (email and phone_number must be unique; email_verified required for login)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  refresh_token TEXT,
  profile_picture TEXT,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KYC (one per user; phone unique for verification)
CREATE TABLE IF NOT EXISTS kyc (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  government_id_type VARCHAR(50) NOT NULL,
  id_number VARCHAR(100) NOT NULL,
  id_front_url TEXT NOT NULL,
  id_back_url TEXT,
  selfie_url TEXT NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  phone_verified BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'pending',
  submission_date TIMESTAMP DEFAULT now(),
  review_date TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT unique_user_kyc UNIQUE (user_id),
  CONSTRAINT kyc_phone_unique UNIQUE (phone_number)
);

-- Phone OTPs (for verification flows)
CREATE TABLE IF NOT EXISTS phone_otps (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Incidents (report, list, map, verify, export)
CREATE TABLE IF NOT EXISTS incidents (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  incident_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status VARCHAR(20) NOT NULL DEFAULT 'unverified' CHECK (status IN ('verified', 'unverified', 'under_review')),
  evidence JSONB DEFAULT '[]'::jsonb,
  witness_count INTEGER NOT NULL DEFAULT 0,
  public_title VARCHAR(255),
  public_description TEXT,
  reporter_trust_level_at_submission INTEGER,
  rejection_reason TEXT,
  ai_screened_at TIMESTAMP,
  ai_screening_result VARCHAR(20),
  ai_notes TEXT,
  reviewed_at TIMESTAMP,
  reviewed_by TEXT,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents(location);

-- Per-evidence AI analysis results (deepfake/manipulation screening)
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_incident_evidence_analysis_incident_file
  ON incident_evidence_analysis(incident_id, file_url);

CREATE INDEX IF NOT EXISTS idx_incident_evidence_analysis_incident_id
  ON incident_evidence_analysis(incident_id);

CREATE INDEX IF NOT EXISTS idx_incident_evidence_analysis_status
  ON incident_evidence_analysis(status);

-- Notification preferences (Profile - Notification Preferences)
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN NOT NULL DEFAULT false,
  critical_incidents_near_me BOOLEAN NOT NULL DEFAULT false,
  report_status_updates BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP DEFAULT now()
);

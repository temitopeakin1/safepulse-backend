-- Email verification: require verified email before login
-- Run: psql -U safepulse_user -d safepulse_db -f src/data/migrations/add_email_verification.sql
-- If your users.id is INTEGER, use the commented block for the tokens table instead.

-- 1. Add email_verified to users (new signups start as unverified)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Mark all existing users as verified so they are not locked out (optional: run only once)
UPDATE users SET email_verified = true WHERE email_verified = false;

-- 2. Email verification tokens (user_id type must match users.id: UUID or INTEGER)
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- If your users.id is INTEGER, run this instead of the block above (drop the UUID table first if you created it):
-- DROP TABLE IF EXISTS email_verification_tokens;
-- CREATE TABLE IF NOT EXISTS email_verification_tokens (
--   id SERIAL PRIMARY KEY,
--   user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
--   token_hash VARCHAR(255) NOT NULL,
--   expires_at TIMESTAMP NOT NULL,
--   created_at TIMESTAMP DEFAULT now()
-- );

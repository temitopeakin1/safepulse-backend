-- Persist user dashboard avatar from KYC selfie
-- Run: psql -U safepulse_user -d safepulse_db -f src/data/migrations/add_user_profile_picture.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_picture TEXT;


ALTER TABLE users 
  ADD COLUMN IF NOT EXIST profile_picture TEXT;
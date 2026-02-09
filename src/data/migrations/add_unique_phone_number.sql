-- Add UNIQUE constraint on phone_number so each user must have a unique phone.
-- Run this on your existing database: psql -U safepulse_user -d safepulse_db -f src/data/migrations/add_unique_phone_number.sql
--
-- If you already have duplicate phone numbers, fix or remove them first, then run this.
-- To find duplicates: SELECT phone_number, COUNT(*) FROM users GROUP BY phone_number HAVING COUNT(*) > 1;

ALTER TABLE users
  ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);

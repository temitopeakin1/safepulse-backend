-- Notification preferences (Profile Settings - Notification Preferences)
-- Run: psql -U safepulse_user -d safepulse_db -f src/data/migrations/create_notification_preferences.sql
-- Supports both integer and UUID user_id: use the type that matches your users.id.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN NOT NULL DEFAULT false,
  critical_incidents_near_me BOOLEAN NOT NULL DEFAULT false,
  report_status_updates BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP DEFAULT now()
);

-- If your users.id is INTEGER, run this instead (comment out the block above first):
-- CREATE TABLE IF NOT EXISTS notification_preferences (
--   user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
--   email_notifications BOOLEAN NOT NULL DEFAULT false,
--   critical_incidents_near_me BOOLEAN NOT NULL DEFAULT false,
--   report_status_updates BOOLEAN NOT NULL DEFAULT false,
--   updated_at TIMESTAMP DEFAULT now()
-- );

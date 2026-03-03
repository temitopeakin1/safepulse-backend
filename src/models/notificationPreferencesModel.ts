import pool from "../config/db";

export interface NotificationPreferences {
  user_id: string;
  email_notifications: boolean;
  critical_incidents_near_me: boolean;
  report_status_updates: boolean;
  updated_at?: Date;
}

const DEFAULTS = {
  email_notifications: false,
  critical_incidents_near_me: false,
  report_status_updates: false,
};

export const getPreferences = async (
  userId: string,
): Promise<NotificationPreferences> => {
  const result = await pool.query(
    `SELECT user_id, email_notifications, critical_incidents_near_me, report_status_updates, updated_at
     FROM notification_preferences WHERE user_id = $1`,
    [userId],
  );
  if (result.rows[0]) {
    return result.rows[0];
  }
  return {
    user_id: userId,
    ...DEFAULTS,
  };
};

export const updatePreferences = async (
  userId: string,
  data: Partial<
    Pick<
      NotificationPreferences,
      | "email_notifications"
      | "critical_incidents_near_me"
      | "report_status_updates"
    >
  >,
): Promise<NotificationPreferences> => {
  const result = await pool.query(
    `INSERT INTO notification_preferences (user_id, email_notifications, critical_incidents_near_me, report_status_updates, updated_at)
     VALUES ($1, COALESCE($2, false), COALESCE($3, false), COALESCE($4, false), now())
     ON CONFLICT (user_id) DO UPDATE SET
       email_notifications = COALESCE(EXCLUDED.email_notifications, notification_preferences.email_notifications),
       critical_incidents_near_me = COALESCE(EXCLUDED.critical_incidents_near_me, notification_preferences.critical_incidents_near_me),
       report_status_updates = COALESCE(EXCLUDED.report_status_updates, notification_preferences.report_status_updates),
       updated_at = now()
     RETURNING user_id, email_notifications, critical_incidents_near_me, report_status_updates, updated_at`,
    [
      userId,
      data.email_notifications,
      data.critical_incidents_near_me,
      data.report_status_updates,
    ],
  );
  return result.rows[0];
};

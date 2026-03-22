import pool from "../config/db";

export type ReporterTrustLevel = 1 | 2 | 3;

export interface ReporterProfile {
  user_id: string;
  reporter_trust_level: ReporterTrustLevel;
  verified_report_count: number;
  rejected_report_count: number;
  blocked_from_reporting: boolean;
  created_at: Date;
  updated_at: Date;
}

const REJECTION_THRESHOLD_BLOCK = 3;

export const getOrCreateReporterProfile = async (
  userId: string,
): Promise<ReporterProfile> => {
  const result = await pool.query(
    `INSERT INTO reporter_profiles (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
     RETURNING *`,
    [userId],
  );
  return result.rows[0];
};

export const isBlockedFromReporting = async (
  userId: string,
): Promise<boolean> => {
  const row = await pool.query(
    "SELECT blocked_from_reporting FROM reporter_profiles WHERE user_id = $1",
    [userId],
  );
  return row.rows[0]?.blocked_from_reporting === true;
};

export const getTrustLevel = async (userId: string): Promise<ReporterTrustLevel> => {
  const profile = await getOrCreateReporterProfile(userId);
  return (profile.reporter_trust_level as ReporterTrustLevel) ?? 1;
};

export const recordVerifiedReport = async (userId: string): Promise<void> => {
  await pool.query(
    `UPDATE reporter_profiles
     SET verified_report_count = verified_report_count + 1,
         reporter_trust_level = CASE
           WHEN verified_report_count + 1 >= 3 THEN 3
           WHEN verified_report_count + 1 >= 1 THEN 2
           ELSE 1
         END,
         updated_at = now()
     WHERE user_id = $1`,
    [userId],
  );
};

export const recordRejectedReport = async (
  userId: string,
): Promise<{ blocked: boolean }> => {
  const result = await pool.query(
    `UPDATE reporter_profiles
     SET rejected_report_count = rejected_report_count + 1,
         reporter_trust_level = GREATEST(1, reporter_trust_level - 1),
         blocked_from_reporting = (rejected_report_count + 1 >= $2),
         updated_at = now()
     WHERE user_id = $1
     RETURNING blocked_from_reporting`,
    [userId, REJECTION_THRESHOLD_BLOCK],
  );
  const blocked = result.rows[0]?.blocked_from_reporting === true;
  return { blocked };
};

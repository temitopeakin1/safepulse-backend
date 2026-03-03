import pool from "../config/db";

export const createVerificationToken = async (
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> => {
  await pool.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET token_hash = $2, expires_at = $3`,
    [userId, tokenHash, expiresAt],
  );
};

export const findValidVerificationToken = async (tokenHash: string) => {
  const result = await pool.query(
    `SELECT * FROM email_verification_tokens
     WHERE token_hash = $1 AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );
  return result.rows[0] ?? null;
};

export const markEmailVerifiedAndDeleteToken = async (
  userId: string,
): Promise<void> => {
  await pool.query("UPDATE users SET email_verified = true WHERE id = $1", [
    userId,
  ]);
  await pool.query("DELETE FROM email_verification_tokens WHERE user_id = $1", [
    userId,
  ]);
};

export const invalidateVerificationTokens = async (
  userId: string,
): Promise<void> => {
  await pool.query("DELETE FROM email_verification_tokens WHERE user_id = $1", [
    userId,
  ]);
};

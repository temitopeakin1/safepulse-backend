import pool from "../config/db";

export const createResetToken = async (
  userId: string,
  tokenHash: string,
  expiresAt: Date
) => {
  // Reuse one existing row for this user to avoid violating uniq_active_reset_token
  const updated = await pool.query(
    `UPDATE password_reset_tokens
     SET token_hash = $2, expires_at = $3, used_at = NULL
     WHERE id = (
       SELECT id FROM password_reset_tokens
       WHERE user_id = $1
       ORDER BY created_at DESC NULLS LAST
       LIMIT 1
     )
     RETURNING id, user_id, expires_at, created_at`,
    [userId, tokenHash, expiresAt]
  );
  if (updated.rowCount && updated.rowCount > 0) {
    return updated.rows[0];
  }
  const result = await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, expires_at, created_at`,
    [userId, tokenHash, expiresAt]
  );
  return result.rows[0];
};

export const findValidResetToken = async (tokenHash: string) => {
  const result = await pool.query(
    `SELECT * FROM password_reset_tokens
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return result.rows[0];
};

export const markTokenUsed = async (tokenId: string) => {
  await pool.query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
    [tokenId]
  );
};

export const invalidateUserTokens = async (userId: string) => {
  await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );
};

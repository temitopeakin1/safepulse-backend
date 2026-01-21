import pool from "../config/db";

export const createResetToken = async (
  userId: string,
  tokenHash: string,
  expiresAt: Date
) => {
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

export const markTokenUsed = async (id: string) => {
  await pool.query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`, 
    [id]
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

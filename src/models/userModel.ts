import pool from "../config/db";

export interface User {
  id: string;
  username?: string;
  email: string;
  password?: string;
  created_at?: Date;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  email_verified?: boolean;
}

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  return result.rows[0];
};

export const findUserById = async (
  userId: string,
): Promise<(User & { password?: string }) | null> => {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [
    userId,
  ]);
  return result.rows[0] ?? null;
};

export const findUserByPhoneNumber = async (
  phoneNumber: string,
): Promise<User | null> => {
  const result = await pool.query(
    "SELECT * FROM users WHERE phone_number = $1",
    [phoneNumber],
  );
  return result.rows[0];
};

export const findUsernameById = async (id: number): Promise<string | null> => {
  const result = await pool.query("SELECT username FROM users WHERE id = $1", [
    id,
  ]);
  return result.rows[0]?.username;
};

export const createUser = async (
  username: string,
  email: string,
  password: string,
): Promise<User> => {
  const result = await pool.query(
    "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
    [username, email, password],
  );
  return result.rows[0];
};

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  email?: string;
}

export const updateUserProfile = async (
  userId: string,
  data: UpdateProfileData,
): Promise<any | null> => {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  if (data.first_name !== undefined) {
    updates.push(`first_name = $${paramIndex}`);
    values.push(data.first_name);
    paramIndex++;
  }
  if (data.last_name !== undefined) {
    updates.push(`last_name = $${paramIndex}`);
    values.push(data.last_name);
    paramIndex++;
  }
  if (data.phone_number !== undefined) {
    updates.push(`phone_number = $${paramIndex}`);
    values.push(data.phone_number);
    paramIndex++;
  }
  if (data.email !== undefined) {
    updates.push(`email = $${paramIndex}`);
    values.push(data.email);
    paramIndex++;
  }
  if (updates.length === 0) return null;
  values.push(userId);
  const result = await pool.query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING id, first_name, last_name, phone_number, email, created_at`,
    values,
  );
  return result.rows[0] ?? null;
};

export const updateUserPassword = async (
  userId: string,
  hashedPassword: string,
): Promise<void> => {
  await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
    hashedPassword,
    userId,
  ]);
};

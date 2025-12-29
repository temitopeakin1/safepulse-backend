import pool from "../config/db";

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  created_at: Date;
}

// Function to find a user by email
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0];
};

// Function to find username by user ID
export const findUsernameById = async (id: number): Promise<string | null> => {
  const result = await pool.query("SELECT username FROM users WHERE id = $1", [id]);
  return result.rows[0]?.username;
};

// Function to create a new user
export const createUser = async (username: string, email: string, password: string): Promise<User> => {
  const result = await pool.query(
    "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
    [username, email, password]
  );
  return result.rows[0];
};

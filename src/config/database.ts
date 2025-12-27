import { Pool } from "pg";

export const pool = new Pool({
  host: "localhost",
  user: "postgres",
  port: 5432,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Optional: test connection
pool.on("connect", () => {
  console.log("PostgreSQL pool connected");
});

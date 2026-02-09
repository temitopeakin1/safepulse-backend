import { Pool } from "pg";
import "dotenv/config";


const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: Number(process.env.DB_PORT),
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export async function checkDbConnection() {
  const res = await pool.query("SELECT 1");
  return res.rowCount === 1;
}

pool.on("connect", () => {
  console.log("PostgreSQL connected");
});

// Optional: test connection
pool.on("error", (err) => {
  console.error("Unexpected pool error", err);
});

export default pool;

// import { Pool } from "pg";
// import dotenv from "dotenv";

// dotenv.config();

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: process.env.NODE_ENV === "production"
//     ? { rejectUnauthorized: false }
//     : false,
// });

// pool.on("connect", () => {
//   console.log("PostgreSQL connected");
// });

// pool.on("error", (err) => {
//   console.error("Unexpected PG error", err);
//   process.exit(1);
// });

// export default pool;

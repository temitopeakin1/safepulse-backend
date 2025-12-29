import { Pool } from "pg";
import dotenv from "dotenv"

dotenv.config()


console.log(Pool)

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: Number(process.env.DB_PORT),
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
});

// Optional: test connection
pool.on("connect", () => {
  console.log("PostgreSQL pool connected");
});

export default pool;

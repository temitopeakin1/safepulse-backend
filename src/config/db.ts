// import { Pool } from "pg";
// import dotenv from "dotenv"

// dotenv.config()


// console.log(Pool)

// const pool = new Pool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   port: Number(process.env.DB_PORT),
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
// });

// // Optional: test connection
// pool.on("connect", () => {
//   console.log("PostgreSQL pool connected");
// });

// export default pool;


import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("connect", () => {
  console.log("PostgreSQL connected");
});

pool.on("error", (err) => {
  console.error("Unexpected PG error", err);
  process.exit(1);
});

export default pool;




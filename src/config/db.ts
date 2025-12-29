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
//  connectionString: process.env.DATABASE_URL,
//   ssl: process.env.NODE_ENV === "production"
//     ? { rejectUnauthorized: false }
//     : false,
// });

// // Optional: test connection
// pool.on("connect", () => {
//   console.log("PostgreSQL pool connected");
// });

// export default pool;

import { Pool } from "pg";

// Load dotenv only in development
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv").config();
}

// Ensure DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Optional: test connection
pool.on("connect", () => {
  console.log("PostgreSQL connected");
});

pool.on("error", (err) => {
  console.error("Unexpected PG error", err);
  process.exit(1);
});

export default pool;

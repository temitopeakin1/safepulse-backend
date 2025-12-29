import express, { Application, Router } from "express";
import dotenv from "dotenv";
import { Request, Response } from "express"; // Import Request and Response from express module
import  pool  from "./config/db";
import errorHandler from "./middleware/errorHandler";
import app from "./app";

// import userRoutes from "routes/userRoutes";
// import productRoutes from "./routes/productRoutes"; // Corrected import path
// import userRoutes from "./routes/userRoutes";
// import errorHandler from "./middleware/errorHandler";
// import connectDb from "../config/dbConnection";

dotenv.config();

// connectDb();
// export const app: Application = express();
const port = Number(process.env.PORT) || 5001

// testing postgres connection
app.get("/", async (req: Request, res: Response) => {
  console.log("start")
  const result = await pool.query("SELECT current_database()");
  console.log("end");
  res.send(`The database name is : ${result.rows[0].current_database}`)
});

// middleware function for error handling
app.use(errorHandler);

// middleware for body-parser
// app.use(express.json());

const router: Router = express.Router();
// app.use("/api/users", userRoutes);

pool
  .connect()
  .then((client) => { 
    console.log("Connected to the postgresql database");
    client.release();

    app.listen(port, () => {
      console.log(`server running on port ${port}`);
    });
  })
  .catch((err: unknown) => {
    console.error("Error connecting to the database", err);
    process.exit(1);
  });

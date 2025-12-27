import express, { Application, Router } from "express";
import dotenv from "dotenv";
import { Request, Response } from "express"; // Import Request and Response from express module
import { pool } from "config/database";
import errorHandler from "./middleware/errorHandler";
// import userRoutes from "routes/userRoutes";
// import productRoutes from "./routes/productRoutes"; // Corrected import path
// import userRoutes from "./routes/userRoutes";
// import errorHandler from "./middleware/errorHandler";
// import connectDb from "../config/dbConnection";

dotenv.config();

// connectDb();
export const app: Application = express();
const port: number = parseInt(process.env.PORT || "5000");

app.get("/", (req: Request, res: Response) => {
  res.send("Server is fine and ready boom");
});

// middleware function for error handling
app.use(errorHandler);

// middleware for body-parser
app.use(express.json());

const router: Router = express.Router();
// app.use("/api/users", userRoutes);

pool.connect().then((client: any) => {
  console.log("Connected to the postgresql database");
  client.release();

  app.listen(port, () => {
    console.log(`server running on port ${port}`);
  });
})
.catch((err: unknown) => {
  console.error("Error connecting to the database", err);
  process.exit(1);
})

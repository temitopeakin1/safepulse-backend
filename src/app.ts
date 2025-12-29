import express from "express";
import errorHandler from "./middleware/errorHandler";
import authRoutes from "./routes/authRoutes";

const app = express();

// body parser
app.use(express.json());

// routes
app.use("/api/users", authRoutes);

// error handler (must be last)
app.use(errorHandler);

export default app;

import express from "express";
import userRoutes from "./routes/userRoutes";
import errorHandler from "./middleware/errorHandler";

const app = express();

// body parser
app.use(express.json());

// routes
app.use("/api/users", userRoutes);

// error handler (must be last)
app.use(errorHandler);

export default app;

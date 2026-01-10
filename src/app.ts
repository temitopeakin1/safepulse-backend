import express from "express";
import errorHandler from "./middleware/errorHandler";
import authRoutes from "./routes/authRoutes";
import kycRoutes from "./routes/kycRoutes";

const app = express();

// body parser
app.use(express.json());

// routes
app.use("/api/users", authRoutes);
app.use("/api/kyc", kycRoutes);

// error handler (must be last)
app.use(errorHandler);

export default app;

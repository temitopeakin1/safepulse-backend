import express from "express";
import cors from "cors";
import errorHandler from "./middleware/errorHandler";
import authRoutes from "./routes/authRoutes";
import kycRoutes from "./routes/kycRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import incidentRoutes from "./routes/incidentRoutes";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger";

const app = express();
export { app };
export default app;

// CORS: allow frontend (local or deployed) to call the API
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);

// body parser
app.use(express.json());

/**
 * @openapi
 * /api/v1/info:
 *   get:
 *     tags: [API]
 *     summary: API info
 *     description: Returns basic API name, version and description
 *     responses:
 *       200:
 *         description: API info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name: { type: string, example: Safepulse API }
 *                 version: { type: string, example: "1.0.0" }
 *                 description: { type: string }
 */
app.get("/api/v1", (_req, res) => {
  res.json({
    name: "Safepulse API",
    version: "v1",
    description: "Safepulse API",
  });
});

// routes (all under /api/v1)
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/kyc", kycRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/incidents", incidentRoutes);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(errorHandler);

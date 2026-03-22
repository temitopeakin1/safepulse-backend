/// <reference path="./types/express.d.ts" />

import "dotenv/config";
import { checkDbConnection } from "./config/db";
import app from "./app";
import { startEvidenceAnalysisWorker } from "./workers/evidenceAnalysisWorker";

const PORT = Number(process.env.PORT || 4000);

async function start() {
  try {
    await checkDbConnection();
    startEvidenceAnalysisWorker();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  }
}

start();

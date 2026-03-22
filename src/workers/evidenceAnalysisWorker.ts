import { Worker } from "bullmq";
import { getRedisConnection, isRedisConfigured } from "../config/redis";
import {
  EVIDENCE_ANALYSIS_QUEUE,
  EvidenceAnalysisJobData,
  processEvidenceAnalysisJob,
} from "../queues/evidenceAnalysisQueue";

let workerRef: Worker<EvidenceAnalysisJobData> | null = null;

export const startEvidenceAnalysisWorker = (): Worker<EvidenceAnalysisJobData> | null => {
  if (!isRedisConfigured()) {
    console.warn("Evidence analysis worker disabled: REDIS_URL missing");
    return null;
  }
  if (workerRef) return workerRef;

  workerRef = new Worker<EvidenceAnalysisJobData>(
    EVIDENCE_ANALYSIS_QUEUE,
    async (job) => processEvidenceAnalysisJob(job),
    {
      connection: getRedisConnection(),
      concurrency: 3,
    },
  );

  workerRef.on("failed", (job, err) => {
    console.error(`Evidence analysis job failed (${job?.id}):`, err);
  });

  return workerRef;
};


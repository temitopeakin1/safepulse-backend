import { Job, Queue } from "bullmq";
import { getRedisConnection, isRedisConfigured } from "../config/redis";
import * as EvidenceAnalysisModel from "../models/evidenceAnalysisModel";
import { analyzeMediaByUrl } from "../services/mediaAnalysisProvider";

export const EVIDENCE_ANALYSIS_QUEUE = "evidence-analysis";

export interface EvidenceAnalysisJobData {
  incidentId: number;
  fileUrl: string;
  fileType?: string;
}

let queueRef: Queue | null = null;

export const getEvidenceAnalysisQueue = (): Queue => {
  if (!isRedisConfigured()) {
    throw new Error("REDIS_URL is not configured");
  }
  if (!queueRef) {
    queueRef = new Queue(EVIDENCE_ANALYSIS_QUEUE, {
      connection: getRedisConnection(),
    });
  }
  return queueRef;
};

export const enqueueEvidenceAnalysis = async (
  data: EvidenceAnalysisJobData,
): Promise<void> => {
  if (!isRedisConfigured()) {
    console.warn("Skipping evidence analysis queue: REDIS_URL missing");
    return;
  }
  const queue = getEvidenceAnalysisQueue();
  await queue.add("analyze-evidence", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: 1000,
    removeOnFail: 1000,
    jobId: `${data.incidentId}:${data.fileUrl}`,
  });
};

export const processEvidenceAnalysisJob = async (
  job: Job<EvidenceAnalysisJobData>,
): Promise<void> => {
  const { incidentId, fileUrl, fileType } = job.data;
  const normalizedType = (fileType ?? "").toLowerCase();
  const supported = ["png", "jpg", "jpeg", "mp4"].includes(normalizedType);

  if (!supported) {
    await EvidenceAnalysisModel.markAnalysisResult({
      incidentId,
      fileUrl,
      status: "skipped",
      errorMessage: `Unsupported type for deepfake scan: ${fileType ?? "unknown"}`,
    });
    await EvidenceAnalysisModel.computeAndPersistIncidentScreening(incidentId);
    return;
  }

  try {
    const result = await analyzeMediaByUrl(fileUrl, normalizedType);
    await EvidenceAnalysisModel.markAnalysisResult({
      incidentId,
      fileUrl,
      status: "complete",
      score: result.score,
      labels: result.labels,
      rawResponse: result.rawResponse,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown analysis error";
    await EvidenceAnalysisModel.markAnalysisResult({
      incidentId,
      fileUrl,
      status: "error",
      errorMessage: message,
    });
  }

  await EvidenceAnalysisModel.computeAndPersistIncidentScreening(incidentId);
};

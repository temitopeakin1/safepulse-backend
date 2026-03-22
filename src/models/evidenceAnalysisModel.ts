import pool from "../config/db";
import { EvidenceItem, ScreeningResult, setIncidentScreening } from "./incidentModel";

export type EvidenceAnalysisStatus = "pending" | "complete" | "error" | "skipped";

export interface EvidenceAnalysisRow {
  id: number;
  incident_id: number;
  file_url: string;
  file_type: string | null;
  provider: string;
  status: EvidenceAnalysisStatus;
  score: number | null;
  labels: Record<string, unknown> | null;
  raw_response: Record<string, unknown> | null;
  error_message: string | null;
  analyzed_at: Date | null;
  created_at: Date;
}

export const createPendingRows = async (
  incidentId: number,
  evidence: EvidenceItem[],
  provider = "managed_api",
): Promise<void> => {
  for (const item of evidence) {
    await pool.query(
      `INSERT INTO incident_evidence_analysis (incident_id, file_url, file_type, provider, status)
       VALUES ($1, $2, $3, $4, 'pending')
       ON CONFLICT (incident_id, file_url)
       DO UPDATE SET file_type = EXCLUDED.file_type, provider = EXCLUDED.provider`,
      [incidentId, item.file_url, item.file_type ?? null, provider],
    );
  }
};

export const markAnalysisResult = async (params: {
  incidentId: number;
  fileUrl: string;
  status: EvidenceAnalysisStatus;
  score?: number | null;
  labels?: Record<string, unknown> | null;
  rawResponse?: Record<string, unknown> | null;
  errorMessage?: string | null;
}): Promise<void> => {
  await pool.query(
    `UPDATE incident_evidence_analysis
     SET status = $1,
         score = $2,
         labels = $3::jsonb,
         raw_response = $4::jsonb,
         error_message = $5,
         analyzed_at = CASE WHEN $1 IN ('complete', 'error', 'skipped') THEN now() ELSE analyzed_at END
     WHERE incident_id = $6 AND file_url = $7`,
    [
      params.status,
      params.score ?? null,
      params.labels ? JSON.stringify(params.labels) : null,
      params.rawResponse ? JSON.stringify(params.rawResponse) : null,
      params.errorMessage ?? null,
      params.incidentId,
      params.fileUrl,
    ],
  );
};

export const getIncidentEvidenceAnalysis = async (
  incidentId: number,
): Promise<EvidenceAnalysisRow[]> => {
  const result = await pool.query(
    `SELECT * FROM incident_evidence_analysis
     WHERE incident_id = $1
     ORDER BY created_at ASC`,
    [incidentId],
  );
  return result.rows;
};

export const computeAndPersistIncidentScreening = async (
  incidentId: number,
): Promise<ScreeningResult> => {
  const result = await pool.query(
    `SELECT status, score, error_message
     FROM incident_evidence_analysis
     WHERE incident_id = $1`,
    [incidentId],
  );
  const rows = result.rows as Array<{
    status: EvidenceAnalysisStatus;
    score: number | null;
    error_message: string | null;
  }>;

  if (!rows.length) {
    await setIncidentScreening(incidentId, "pending", "No evidence analysis rows found");
    return "pending";
  }

  const hasPending = rows.some((r) => r.status === "pending");
  const hasError = rows.some((r) => r.status === "error");
  const maxScore = rows.reduce((max, row) => {
    if (typeof row.score !== "number") return max;
    return Math.max(max, row.score);
  }, 0);

  let screening: ScreeningResult = "passed";
  if (hasPending) screening = "pending";
  if (!hasPending && (hasError || maxScore >= 0.8)) screening = "flagged";

  const noteParts: string[] = [];
  noteParts.push(`max_score=${maxScore.toFixed(3)}`);
  if (hasPending) noteParts.push("pending_evidence=true");
  if (hasError) noteParts.push("analysis_errors=true");

  await setIncidentScreening(incidentId, screening, noteParts.join("; "));
  return screening;
};


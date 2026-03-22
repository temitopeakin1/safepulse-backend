import axios from "axios";

export type MediaAnalysisResult = {
  score: number;
  labels: Record<string, unknown>;
  rawResponse: Record<string, unknown>;
};

const clampScore = (value: number): number => {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

export const analyzeMediaByUrl = async (
  fileUrl: string,
  fileType?: string,
): Promise<MediaAnalysisResult> => {
  const endpoint = process.env.MEDIA_ANALYSIS_API_URL;
  const apiKey = process.env.MEDIA_ANALYSIS_API_KEY;

  if (!endpoint) {
    // Safe fallback for local/dev when provider is not configured.
    return {
      score: 0.1,
      labels: { source: "fallback", reason: "MEDIA_ANALYSIS_API_URL missing" },
      rawResponse: { simulated: true, fileUrl, fileType: fileType ?? null },
    };
  }

  const response = await axios.post(
    endpoint,
    { file_url: fileUrl, file_type: fileType ?? null },
    {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      timeout: 30_000,
    },
  );

  const data = (response?.data ?? {}) as Record<string, unknown>;
  const scoreRaw = typeof data.score === "number" ? data.score : 0;

  return {
    score: clampScore(scoreRaw),
    labels: (data.labels as Record<string, unknown>) ?? {},
    rawResponse: data,
  };
};

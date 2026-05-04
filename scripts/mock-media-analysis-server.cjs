/**
 * Local stub for MEDIA_ANALYSIS_API_URL — tests the real SafePulse pipeline
 * (Redis queue → worker → axios → this server → DB screening).
 *
 * Usage:
 *   MOCK_MEDIA_ANALYSIS_SCORE=0.15 node scripts/mock-media-analysis-server.cjs
 *   MOCK_MEDIA_ANALYSIS_SCORE=0.85 node scripts/mock-media-analysis-server.cjs   # triggers "flagged" (>= 0.8)
 *
 * .env on main app:
 *   MEDIA_ANALYSIS_API_URL=http://127.0.0.1:4001
 *   MEDIA_ANALYSIS_API_KEY=   # optional; send Authorization: Bearer <key> from app if set
 */

const http = require("http");

const PORT = Number(process.env.MOCK_MEDIA_ANALYSIS_PORT || 4001);
/** 0–1; scores >= 0.8 mark incident screening as "flagged" in evidenceAnalysisModel */
const SCORE = Number(process.env.MOCK_MEDIA_ANALYSIS_SCORE ?? 0.12);
const EXPECTED_BEARER = process.env.MOCK_MEDIA_ANALYSIS_EXPECT_BEARER || "";

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST") {
    sendJson(res, 404, { error: "POST only" });
    return;
  }

  if (EXPECTED_BEARER) {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== EXPECTED_BEARER) {
      sendJson(res, 401, { error: "invalid or missing bearer token" });
      return;
    }
  }

  let raw = "";
  req.on("data", (c) => {
    raw += c;
  });
  req.on("end", () => {
    let parsed = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      sendJson(res, 400, { error: "invalid JSON" });
      return;
    }

    const score = Number.isFinite(SCORE) ? Math.min(1, Math.max(0, SCORE)) : 0.12;
    sendJson(res, 200, {
      score,
      labels: {
        source: "mock-media-analysis-server",
        file_url: parsed.file_url ?? null,
        file_type: parsed.file_type ?? null,
      },
      note: "Replace this with a real deepfake/manipulation API in production.",
    });
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `[mock-media-analysis] listening on http://127.0.0.1:${PORT}  (score=${SCORE}, flagged if score>=0.8 in app)`,
  );
});

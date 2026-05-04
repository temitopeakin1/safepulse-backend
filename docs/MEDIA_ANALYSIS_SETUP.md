# Media analysis (deepfake / manipulation) — backend setup

The API does **not** run a model inside Node. It calls **`MEDIA_ANALYSIS_API_URL`** with `{ file_url, file_type }` and expects JSON `{ score: number }` (0–1). That score is stored and rolled up into incident **AI screening** (`passed` / `flagged` / `pending`).

## 1. Run Redis

Required for the evidence-analysis **queue** and **worker** (same process as `npm run dev`).

```bash
# Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

## 2. Configure `.env`

```env
REDIS_URL=redis://127.0.0.1:6379
MEDIA_ANALYSIS_API_URL=http://127.0.0.1:4001
# Optional — must match mock if you set MOCK_MEDIA_ANALYSIS_EXPECT_BEARER
# MEDIA_ANALYSIS_API_KEY=dev-secret
```

If `MEDIA_ANALYSIS_API_URL` is **unset**, the worker still runs but `analyzeMediaByUrl` uses a **fallback** score (no HTTP call).

## 3. Start the mock provider (local dev)

Terminal A:

```bash
npm run mock:media-analysis
```

Optional env:

| Variable | Default | Purpose |
|----------|---------|---------|
| `MOCK_MEDIA_ANALYSIS_PORT` | `4001` | Listen port |
| `MOCK_MEDIA_ANALYSIS_SCORE` | `0.12` | Returned `score` (use `0.85` to test **flagged** ≥ 0.8) |
| `MOCK_MEDIA_ANALYSIS_EXPECT_BEARER` | (empty) | If set, require `Authorization: Bearer <value>` |

## 4. Start the API

Terminal B:

```bash
npm run dev
```

## 5. Verify without the frontend

1. **Auth**: get a JWT (register/login as usual).
2. **Upload evidence** (multipart): `POST /api/v1/incidents/evidence/upload` with field `evidence`.
3. **Create incident** with returned URLs: `POST /api/v1/incidents` body includes `evidence: [{ file_url, file_type }]`.
4. Wait a few seconds for the worker.
5. **Check DB** (optional): `incident_evidence_analysis` rows should move from `pending` to `complete`; `incidents.ai_screening_result` should update.
6. **Check API** (if exposed): `GET /api/v1/incidents/:id/evidence-analysis` (auth) — see per-file scores.

## 6. Production

Point `MEDIA_ANALYSIS_API_URL` at your real service. Contract:

- **Request**: `POST` JSON `{ "file_url": "<https...>", "file_type": "mp4" }`
- **Response**: JSON with numeric **`score`** in `[0, 1]` (higher = more suspicious in current logic; `>= 0.8` sets screening to **flagged**).

Your service must be able to **fetch** `file_url` (or proxy through signed URLs). Adjust `mediaAnalysisProvider.ts` if your vendor uses a different shape.

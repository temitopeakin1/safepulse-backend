# Public endpoints (no auth)

These GET routes do **not** require an `Authorization` header. Visitors (not logged in) can call them to see Home cards, map, incidents list, historical data, and incident details. Submit report flow remains protected (sign up / sign in + KYC).

| # | Method | Route | Purpose |
|---|--------|-------|---------|
| 1 | GET | `/api/v1/dashboard/summary` | Home summary cards |
| 2 | GET | `/api/v1/dashboard/activity` | Home activity feed |
| 3 | GET | `/api/v1/incidents` | List incidents (filters, pagination) |
| 4 | GET | `/api/v1/incidents/map` | Map markers |
| 5 | GET | `/api/v1/incidents/:id` | Incident detail by ID |

**Still protected (auth required):**

- `POST /api/v1/incidents` — create/report incident
- All `/api/v1/auth/*` and `/api/v1/kyc/*` routes

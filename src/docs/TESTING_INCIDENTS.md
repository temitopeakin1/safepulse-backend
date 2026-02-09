# Testing Incident API Endpoints

## 1. Get an access token (login)

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"YourPassword123!"}'
```

Copy the `accessToken` from the response. Use it as `Authorization: Bearer <token>` for protected endpoints.

---

## 2. Report an incident (POST /api/v1/incidents) — requires auth

```bash
curl -X POST http://localhost:4000/api/v1/incidents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "incident_type": "Traffic Collision",
    "title": "Minivan stuck in street",
    "location": "Victoria Island Lagos",
    "severity": "critical",
    "description": "Vehicle blocking main road",
    "latitude": 6.4281,
    "longitude": 3.4219
  }'
```

---

## 3. List incidents (GET /api/v1/incidents) — no auth

```bash
# All incidents, default pagination
curl http://localhost:4000/api/v1/incidents

# With filters
curl "http://localhost:4000/api/v1/incidents?page=1&limit=10&severity=critical&search=fire"
```

---

## 4. Get incident by ID (GET /api/v1/incidents/:id)

```bash
curl http://localhost:4000/api/v1/incidents/1
```

---

## 5. Get map markers (GET /api/v1/incidents/map)

```bash
curl "http://localhost:4000/api/v1/incidents/map"
curl "http://localhost:4000/api/v1/incidents/map?severity=critical"
```

---

## 6. Verify incident (POST /api/v1/incidents/:id/verify) — requires auth

```bash
curl -X POST http://localhost:4000/api/v1/incidents/1/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"status":"verified"}'
```

---

## 7. Export incidents (GET /api/v1/incidents/export)

```bash
# JSON (default)
curl "http://localhost:4000/api/v1/incidents/export"

# CSV download
curl "http://localhost:4000/api/v1/incidents/export?format=csv" -o incidents.csv

# With filters
curl "http://localhost:4000/api/v1/incidents/export?format=csv&severity=high" -o incidents.csv
```

---

## Swagger UI

1. Start the server: `npm run dev`
2. Open: **http://localhost:4000/docs**
3. Use **Authorize** to add your Bearer token (from login), then try the **Incidents** endpoints from the UI.

# Safepulse API

REST API backend for **Safepulse** — authentication, KYC, incident reporting, and dashboard. Built with Node.js, TypeScript, Express, and PostgreSQL.

## Tech Stack

- **Runtime:** Node.js  
- **Language:** TypeScript  
- **Framework:** Express 5  
- **Database:** PostgreSQL (via `pg`)  
- **Auth:** JWT (access + refresh), bcrypt  
- **Validation:** Zod  
- **Docs:** Swagger (OpenAPI) at `/docs`  
- **Other:** CORS, rate limiting, Cloudinary (optional uploads)

## Prerequisites

- Node.js (v18+)
- PostgreSQL
- npm or yarn

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd safepulse-backend
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=safepulse_user
DB_PASSWORD=your_password
DB_NAME=safepulse_db

# JWT
ACCESS_TOKEN_SECRET=your_access_secret
REFRESH_TOKEN_SECRET=your_refresh_secret

# Optional: Cloudinary (for uploads)
# CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=
```

### 3. Database and migrations

Create the database and user in PostgreSQL, then run migrations in order:

```bash
# From project root (adjust -U and -d if needed)
psql -U safepulse_user -d safepulse_db -f src/data/migrations/schema.sql
psql -U safepulse_user -d safepulse_db -f src/data/migrations/add_email_verification.sql
psql -U safepulse_user -d safepulse_db -f src/data/migrations/add_unique_phone_number.sql
psql -U safepulse_user -d safepulse_db -f src/data/migrations/create_notification_preferences.sql
psql -U safepulse_user -d safepulse_db -f src/data/migrations/create_incidents_table.sql
psql -U safepulse_user -d safepulse_db -f src/data/migrations/add_incident_evidence.sql
```

> **Note:** If `users.id` is **INTEGER** (not UUID), use the commented block in `add_email_verification.sql` for the `email_verification_tokens` table. If you use UUID for `users.id`, ensure `create_incidents_table.sql` matches (e.g. `user_id UUID REFERENCES users(id)`).

### 4. Run the server

```bash
# Development (with auto-reload)
npm run dev

# Production build and start
npm run build
npm start
```

Server runs at **http://localhost:4000** (or the port in `.env`).  
API docs: **http://localhost:4000/docs**.

## API Overview

All routes are under **`/api/v1`**.

| Area | Base path | Description |
|------|-----------|-------------|
| **Auth** | `/api/v1/auth` | Register, login, email verification, forgot/reset password, profile, notification preferences, change password |
| **KYC** | `/api/v1/kyc` | Submit KYC, get KYC status |
| **Dashboard** | `/api/v1/dashboard` | Summary stats, activity feed (filter by date/location) |
| **Incidents** | `/api/v1/incidents` | Create, list, get by ID, map markers, verify, export |

- **Auth:** Register requires email verification before login. Use `GET /api/v1/auth/verify-email?token=...` (from email link) and `POST /api/v1/auth/resend-verification-email` with `{ "email": "..." }` if needed.
- **Protected routes:** Send `Authorization: Bearer <access_token>`.
- **Refresh token:** `POST /api/v1/auth/refresh` with body `{ "refreshToken": "..." }`.

See **Swagger** at `/docs` for full request/response schemas and examples.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start dev server with ts-node-dev |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled app (`dist/index.js`) |
| `npm test` | Placeholder (no tests yet) |

## Project Structure

```
src/
├── app.ts                 # Express app, routes, Swagger mount
├── index.ts               # Entry: DB check, start server
├── config/
│   └── db.ts              # PostgreSQL pool
├── controllers/           # Request handlers (auth, kyc, dashboard, incident, user)
├── data/migrations/       # SQL migrations (schema + additive)
├── docs/                  # Swagger config, PROFILE_SETTINGS_API.md, etc.
├── middleware/            # Error handler, rate limiter, validateBody, validateToken
├── models/                # DB access (users, kyc, incidents, dashboard, etc.)
├── routes/                # Auth, KYC, dashboard, incidents
├── types/                 # Express augmentations
├── utils/                 # Logger, validate (Zod), Cloudinary/upload
└── validators/            # Zod schemas (auth, incident, media)
```

## Migrations (reference)

- **schema.sql** — Users, password_reset_tokens, kyc, phone_otps, incidents, notification_preferences (base schema).
- **add_email_verification.sql** — `users.email_verified`, table `email_verification_tokens`.
- **add_unique_phone_number.sql** — Unique constraint on `users.phone_number`.
- **create_notification_preferences.sql** — Table for profile notification preferences.
- **create_incidents_table.sql** — Incidents table (if not in schema).
- **add_incident_evidence.sql** — `evidence` JSONB column on incidents.

## License

ISC

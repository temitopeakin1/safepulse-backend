# Profile Settings (Figma) — API mapping

How the **Profile & Settings** Figma sections map to API endpoints.

---

## 1. Personal Information

- **Figma:** Name, Email, Edit button  
- **API:**
  - **GET /api/v1/auth/current** — get current user (name = firstName + lastName, email)
  - **PATCH /api/v1/auth/update** — edit name (firstName, lastName), phone, email  
- **Auth:** Bearer token required for both.

---

## 2. Identity Verification (KYC)

- **Figma:** “Not Verified” / “Complete KYC to submit reports”, Start Verification, Edit  
- **API:**
  - **GET /api/v1/kyc/status** — get KYC status (submitted, status, phone_verified, etc.)  
  - **POST /api/v1/kyc/submit** — submit KYC (Start Verification flow)  
- **Auth:** Bearer token required for both.  
- Use **GET /api/v1/kyc/status** to show “Verified” or “Not Verified” and to drive the “Start Verification” / “Edit” actions.

---

## 3. Notification Preferences

- **Figma:** Email notifications, Critical incidents near me, Report status updates (checkboxes), Edit  
- **API:**
  - **GET /api/v1/auth/preferences** — get notification preferences (defaults if none set)  
  - **PATCH /api/v1/auth/preferences** — update preferences (Edit)  
- **Body for PATCH:**  
  `{ "emailNotifications": true, "criticalIncidentsNearMe": true, "reportStatusUpdates": false }`  
  Send only the keys you want to change.  
- **Auth:** Bearer token required for both.

---

## 4. Security

- **Figma:** Change Password  
- **API:**
  - **POST /api/v1/auth/change-password** — change password (current + new)  
- **Body:**  
  `{ "currentPassword": "...", "newPassword": "...", "confirmPassword": "..." }`  
  `newPassword` must meet strength rules (min 8 chars, upper, lower, number, special).  
- **Auth:** Bearer token required.

---

## Create `notification_preferences` table

If this table does not exist yet, run the migration that matches your `users.id` type:

- **users.id is UUID:**  
  `psql -U safepulse_user -d safepulse_db -f src/data/migrations/create_notification_preferences.sql`
- **users.id is INTEGER:**  
  Edit the migration file and use the commented block with `user_id INTEGER`, then run it.

After that, **GET** and **PATCH /api/v1/auth/preferences** will work.

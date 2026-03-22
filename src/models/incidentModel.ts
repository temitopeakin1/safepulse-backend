import pool from "../config/db";

export type Severity = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "verified" | "unverified" | "under_review";

export interface EvidenceItem {
  file_url: string;
  file_name?: string;
  file_type?: string;
}

export interface Incident {
  id: number;
  user_id: string;
  incident_type: string;
  title: string;
  description: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  severity: Severity;
  status: IncidentStatus;
  evidence?: EvidenceItem[] | string;
  witness_count?: number;
  public_title: string | null;
  public_description: string | null;
  reporter_trust_level_at_submission?: number | null;
  rejection_reason?: string | null;
  ai_screened_at?: Date | null;
  ai_screening_result?: string | null;
  ai_notes?: string | null;
  reviewed_at?: Date | null;
  reviewed_by?: string | null;
  review_notes?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateIncidentInput {
  user_id: string;
  incident_type: string;
  title: string;
  description?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  severity: Severity;
  evidence?: EvidenceItem[];
  witness_count?: number;
  reporter_trust_level_at_submission?: number;
}

export type ListScope = "public" | "all";

export interface ListIncidentsFilters {
  page?: number;
  limit?: number;
  type?: string;
  severity?: Severity;
  location?: string;
  search?: string;
  scope?: ListScope;
}

export const createIncident = async (
  input: CreateIncidentInput,
): Promise<Incident> => {
  const evidenceJson =
    input.evidence && input.evidence.length > 0
      ? JSON.stringify(input.evidence)
      : "[]";
  const witnessCount = Math.max(0, input.witness_count ?? 0);
  const hasEvidence =
    input.evidence && Array.isArray(input.evidence) && input.evidence.length > 0;
  const hasSupport = hasEvidence || witnessCount >= 1;
  const initialStatus: IncidentStatus = hasSupport
    ? "under_review"
    : "unverified";
  const publicTitle =
    `Reported ${input.incident_type} in ${input.location} — ${initialStatus}`;
  const trustLevel = input.reporter_trust_level_at_submission ?? null;
  const result = await pool.query(
    `INSERT INTO incidents (user_id, incident_type, title, description, location, latitude, longitude, severity, evidence, status, witness_count, public_title, public_description, reporter_trust_level_at_submission)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      input.user_id,
      input.incident_type,
      input.title,
      input.description ?? null,
      input.location,
      input.latitude ?? null,
      input.longitude ?? null,
      input.severity,
      evidenceJson,
      initialStatus,
      witnessCount,
      publicTitle,
      null,
      trustLevel,
    ],
  );
  return result.rows[0];
};

export const findAllIncidents = async (
  filters: ListIncidentsFilters,
): Promise<{ incidents: Incident[]; total: number }> => {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.scope === "public") {
    conditions.push(`status = 'verified'`);
  }

  if (filters.type) {
    conditions.push(`incident_type = $${paramIndex}`);
    params.push(filters.type);
    paramIndex++;
  }
  if (filters.severity) {
    conditions.push(`severity = $${paramIndex}`);
    params.push(filters.severity);
    paramIndex++;
  }
  if (filters.location) {
    conditions.push(`location ILIKE $${paramIndex}`);
    params.push(`%${filters.location}%`);
    paramIndex++;
  }
  if (filters.search) {
    conditions.push(
      `(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR location ILIKE $${paramIndex})`,
    );
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ");
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM incidents WHERE ${whereClause}`,
    params,
  );
  const total = countResult.rows[0].total;

  params.push(limit, offset);
  const result = await pool.query(
    `SELECT * FROM incidents WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params,
  );

  return { incidents: result.rows, total };
};

export const findIncidentById = async (
  id: number,
): Promise<Incident | null> => {
  const result = await pool.query("SELECT * FROM incidents WHERE id = $1", [
    id,
  ]);
  return result.rows[0] ?? null;
};

export const getMapMarkers = async (filters?: {
  severity?: Severity;
  location?: string;
  scope?: ListScope;
}) => {
  const conditions: string[] = [
    "1=1",
    "latitude IS NOT NULL",
    "longitude IS NOT NULL",
  ];
  const params: unknown[] = [];
  let paramIndex = 1;
  if (filters?.scope === "public") {
    conditions.push(`status = 'verified'`);
  }
  if (filters?.severity) {
    conditions.push(`severity = $${paramIndex}`);
    params.push(filters.severity);
    paramIndex++;
  }
  if (filters?.location) {
    conditions.push(`location ILIKE $${paramIndex}`);
    params.push(`%${filters.location}%`);
  }
  const whereClause = conditions.join(" AND ");
  const result = await pool.query(
    `SELECT id, incident_type, title, location, latitude, longitude, severity, status, public_title, created_at
     FROM incidents WHERE ${whereClause}
     ORDER BY created_at DESC`,
    params,
  );
  return result.rows;
};

export const setIncidentStatus = async (
  id: number,
  status: IncidentStatus,
  options?: {
    reviewed_by?: string;
    review_notes?: string;
    rejection_reason?: string;
  },
): Promise<Incident | null> => {
  if (status === "verified" && options?.reviewed_by !== undefined) {
    const result = await pool.query(
      `UPDATE incidents SET status = $1, updated_at = now(), reviewed_at = now(), reviewed_by = $2, review_notes = $3, rejection_reason = null WHERE id = $4 RETURNING *`,
      [status, options.reviewed_by, options.review_notes ?? null, id],
    );
    return result.rows[0] ?? null;
  }
  if (status === "unverified" && options?.rejection_reason !== undefined) {
    const result = await pool.query(
      `UPDATE incidents SET status = $1, updated_at = now(), rejection_reason = $2 WHERE id = $3 RETURNING *`,
      [status, options.rejection_reason ?? null, id],
    );
    return result.rows[0] ?? null;
  }
  const result = await pool.query(
    `UPDATE incidents SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [status, id],
  );
  return result.rows[0] ?? null;
};

export type ScreeningResult = "pending" | "passed" | "flagged";

export const setIncidentScreening = async (
  id: number,
  result: ScreeningResult,
  notes?: string | null,
): Promise<Incident | null> => {
  const query = await pool.query(
    `UPDATE incidents SET ai_screened_at = now(), ai_screening_result = $1, ai_notes = $2, updated_at = now() WHERE id = $3 RETURNING *`,
    [result, notes ?? null, id],
  );
  return query.rows[0] ?? null;
};

export const getIncidentsForExport = async (
  filters: Omit<ListIncidentsFilters, "page" | "limit">,
) => {
  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];
  let paramIndex = 1;
  if (filters.scope === "public") {
    conditions.push(`status = 'verified'`);
  }
  if (filters.type) {
    conditions.push(`incident_type = $${paramIndex}`);
    params.push(filters.type);
    paramIndex++;
  }
  if (filters.severity) {
    conditions.push(`severity = $${paramIndex}`);
    params.push(filters.severity);
    paramIndex++;
  }
  if (filters.location) {
    conditions.push(`location ILIKE $${paramIndex}`);
    params.push(`%${filters.location}%`);
    paramIndex++;
  }
  if (filters.search) {
    conditions.push(
      `(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR location ILIKE $${paramIndex})`,
    );
    params.push(`%${filters.search}%`);
  }
  const whereClause = conditions.join(" AND ");
  const result = await pool.query(
    `SELECT id, incident_type, title, location, severity, status, public_title, public_description, created_at
     FROM incidents WHERE ${whereClause}
     ORDER BY created_at DESC`,
    params,
  );
  return result.rows;
};

export const getConfirmationCount = async (
  incidentId: number,
): Promise<number> => {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS cnt FROM incident_witness_confirmations WHERE incident_id = $1",
    [incidentId],
  );
  return result.rows[0]?.cnt ?? 0;
};

export const addWitnessConfirmation = async (
  incidentId: number,
  userId: string,
): Promise<"created" | "already_exists"> => {
  const result = await pool.query(
    `INSERT INTO incident_witness_confirmations (incident_id, user_id) VALUES ($1, $2)
     ON CONFLICT (incident_id, user_id) DO NOTHING`,
    [incidentId, userId],
  );
  return result.rowCount && result.rowCount > 0 ? "created" : "already_exists";
};

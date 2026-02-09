import pool from "../config/db";

export type Severity = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "verified" | "unverified";

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
}

export interface ListIncidentsFilters {
  page?: number;
  limit?: number;
  type?: string;
  severity?: Severity;
  location?: string;
  search?: string;
}

export const createIncident = async (input: CreateIncidentInput): Promise<Incident> => {
  const evidenceJson =
    input.evidence && input.evidence.length > 0
      ? JSON.stringify(input.evidence)
      : "[]";
  const result = await pool.query(
    `INSERT INTO incidents (user_id, incident_type, title, description, location, latitude, longitude, severity, evidence)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
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
    ]
  );
  return result.rows[0];
};

export const findAllIncidents = async (
  filters: ListIncidentsFilters
): Promise<{ incidents: Incident[]; total: number }> => {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];
  let paramIndex = 1;

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
      `(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR location ILIKE $${paramIndex})`
    );
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ");
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM incidents WHERE ${whereClause}`,
    params
  );
  const total = countResult.rows[0].total;

  params.push(limit, offset);
  const result = await pool.query(
    `SELECT * FROM incidents WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  return { incidents: result.rows, total };
};

export const findIncidentById = async (id: number): Promise<Incident | null> => {
  const result = await pool.query("SELECT * FROM incidents WHERE id = $1", [id]);
  return result.rows[0] ?? null;
};

export const getMapMarkers = async (filters?: { severity?: Severity; location?: string }) => {
  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];
  let paramIndex = 1;
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
    `SELECT id, incident_type, title, location, latitude, longitude, severity, status, created_at
     FROM incidents WHERE ${whereClause}
     ORDER BY created_at DESC`,
    params
  );
  return result.rows;
};

export const setIncidentVerified = async (
  id: number,
  status: "verified" | "unverified"
): Promise<Incident | null> => {
  const result = await pool.query(
    `UPDATE incidents SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0] ?? null;
};

export const getIncidentsForExport = async (
  filters: Omit<ListIncidentsFilters, "page" | "limit">
) => {
  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];
  let paramIndex = 1;
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
      `(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR location ILIKE $${paramIndex})`
    );
    params.push(`%${filters.search}%`);
  }
  const whereClause = conditions.join(" AND ");
  const result = await pool.query(
    `SELECT id, incident_type, title, location, severity, status, created_at
     FROM incidents WHERE ${whereClause}
     ORDER BY created_at DESC`,
    params
  );
  return result.rows;
};

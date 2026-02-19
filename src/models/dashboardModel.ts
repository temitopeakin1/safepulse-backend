import pool from "../config/db";

type SummaryFilters = {
  from?: string;
  to?: string;
  city?: string;
};

export const fetchDashboardSummary = async (filters: SummaryFilters) => {
  const where: string[] = [];
  const values: any[] = [];

  // created_at >= from
  if (filters.from) {
    values.push(filters.from);
    where.push(`created_at >= $${values.length}::date`);
  }

  if (filters.to) {
    values.push(filters.to);
    where.push(`created_at < ($${values.length}::date + INTERVAL '1 day')`);
  }

  if (filters.city) {
    values.push(filters.city);
    where.push(`location ILIKE $${values.length}`);
    values[values.length - 1] = `%${filters.city}%`;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // total + high severity + verified counts
  const totalsSql = `
    SELECT
      COUNT(*)::int AS total_incidents,
      COUNT(*) FILTER (WHERE severity IN ('high','critical'))::int AS high_severity,
      COUNT(*) FILTER (WHERE status = 'verified')::int AS verified_count
    FROM incidents
    ${whereSql};
  `;

  // top incident type
  const topTypeSql = `
    SELECT incident_type, COUNT(*)::int AS cnt
    FROM incidents
    ${whereSql}
    GROUP BY incident_type
    ORDER BY cnt DESC
    LIMIT 1;
  `;

  const totalsRes = await pool.query(totalsSql, values);
  const topTypeRes = await pool.query(topTypeSql, values);

  const totals = totalsRes.rows[0];
  const topTypeRow = topTypeRes.rows[0];

  const total = Number(totals?.total_incidents || 0);
  const verified = Number(totals?.verified_count || 0);

  const verificationRate =
    total === 0 ? 0 : Math.round((verified / total) * 100);

  return {
    totalIncidents: Number(totals?.total_incidents || 0),
    highSeverity: Number(totals?.high_severity || 0),
    topIncidentType: topTypeRow?.incident_type || null,
    verificationRate,
  };
};

type ActivityFilters = {
  from?: string;
  to?: string;
  city?: string;
  limit?: number;
};

export const fetchDashboardActivity = async (filters: ActivityFilters) => {
  const where: string[] = [];
  const values: any[] = [];

  if (filters.from) {
    values.push(filters.from);
    where.push(`created_at >= $${values.length}::date`);
  }

  if (filters.to) {
    values.push(filters.to);
    where.push(`created_at < ($${values.length}::date + INTERVAL '1 day')`);
  }

  if (filters.city) {
    values.push(`%${filters.city}%`);
    where.push(`location ILIKE $${values.length}`);
  }

  const limit = Math.min(Math.max(filters.limit ?? 10, 1), 50);
  values.push(limit);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // Keep this lightweight (feed-like)
  const sql = `
    SELECT
      id,
      id AS incident_id,
      title,
      location,
      severity,
      status,
      created_at
    FROM incidents
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT $${values.length};
  `;

  const res = await pool.query(sql, values);
  return res.rows;
};

import pool from "../config/db";

export type ValidatorType =
  | "moderator"
  | "ngo"
  | "journalist"
  | "legal_observer";

export interface IncidentValidation {
  id: number;
  incident_id: number;
  validator_type: ValidatorType;
  validator_id: string | null;
  validator_name: string | null;
  validated_at: Date;
  created_at: Date;
}

export interface AddValidationInput {
  incident_id: number;
  validator_type: ValidatorType;
  validator_id?: string | null;
  validator_name?: string | null;
}

export const addValidation = async (
  input: AddValidationInput,
): Promise<IncidentValidation> => {
  const result = await pool.query(
    `INSERT INTO incident_validations (incident_id, validator_type, validator_id, validator_name)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      input.incident_id,
      input.validator_type,
      input.validator_id ?? null,
      input.validator_name ?? null,
    ],
  );
  return result.rows[0];
};

export const getValidationsForIncident = async (
  incidentId: number,
): Promise<IncidentValidation[]> => {
  const result = await pool.query(
    `SELECT * FROM incident_validations WHERE incident_id = $1 ORDER BY validated_at DESC`,
    [incidentId],
  );
  return result.rows;
};

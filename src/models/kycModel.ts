import pool from "../config/db";

export interface KYC {
  id?: number;
  user_id: string;
  full_name: string;
  government_id_type: string;
  id_number: string;
  id_front_url: string;
  id_back_url: string;
  selfie_url: string;
  phone_number: string;
  phone_verified?: boolean;
  status?: string;
  submission_date?: Date;
  review_date?: Date;
  rejection_reason?: string;
}

export const createKYC = async (kyc: KYC) => {
  const result = await pool.query(
    `INSERT INTO kyc 
    (user_id, full_name, government_id_type, id_number, id_front_url, id_back_url, selfie_url, phone_number)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *`,
    [
      kyc.user_id,
      kyc.full_name,
      kyc.government_id_type,
      kyc.id_number,
      kyc.id_front_url,
      kyc.id_back_url,
      kyc.selfie_url,
      kyc.phone_number
    ]
  );
  return result.rows[0];
};

export const getKYCByUserId = async (userId: string) => {
  const result = await pool.query(`SELECT * FROM kyc WHERE user_id = $1`, [userId]);
  return result.rows[0];
};

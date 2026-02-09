import express from "express";
import { getKycStatus, submitKYC } from "../controllers/kycController";
import validateToken from "../middleware/validateTokenHandler";

const router = express.Router();

/**
 * @openapi
 * /api/v1/kyc/submit:
 *   post:
 *     tags: [KYC]
 *     summary: Submit KYC (identity verification)
 *     description: Submit KYC with JSON and image URLs (e.g. Base64 or uploaded URLs)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, government_id_type, id_number, phone_number, id_front, id_back, selfie]
 *             properties:
 *               full_name: { type: string }
 *               government_id_type: { type: string, example: passport }
 *               id_number: { type: string }
 *               phone_number: { type: string }
 *               id_front:
 *                 type: object
 *                 required: [file_url]
 *                 properties:
 *                   file_url: { type: string }
 *                   file_name: { type: string }
 *               id_back:
 *                 type: object
 *                 required: [file_url]
 *                 properties:
 *                   file_url: { type: string }
 *                   file_name: { type: string }
 *               selfie:
 *                 type: object
 *                 required: [file_url]
 *                 properties:
 *                   file_url: { type: string }
 *                   file_name: { type: string }
 *     responses:
 *       200:
 *         description: KYC submitted successfully
 *       400:
 *         description: Validation error - all fields required
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: KYC already submitted or phone/ID already used
 */
router.post("/submit", validateToken, submitKYC);

/**
 * @openapi
 * /api/v1/kyc/status:
 *   get:
 *     tags: [KYC]
 *     summary: Get current user's KYC status
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: KYC status (submitted, not_submitted, pending, approved, rejected)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 kyc:
 *                   type: object
 *                   properties:
 *                     submitted: { type: boolean }
 *                     status: { type: string }
 *                     phone_verified: { type: boolean }
 *                     submission_date: { type: string, nullable: true }
 *                     review_date: { type: string, nullable: true }
 *                     rejection_reason: { type: string, nullable: true }
 *       401:
 *         description: Unauthorized
 */
router.get("/status", validateToken, getKycStatus);

export default router;

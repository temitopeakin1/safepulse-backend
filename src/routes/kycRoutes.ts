import express from "express";
import {
  getKycStatus,
  submitKYC,
  uploadKycDocument,
} from "../controllers/kycController";
import validateToken from "../middleware/validateTokenHandler";
import { uploadKycFile } from "../middleware/uploadKyc";

const router = express.Router();

/**
 * @openapi
 * /api/v1/kyc/upload:
 *   post:
 *     tags: [KYC]
 *     summary: Upload KYC document (Step 1 or Step 2)
 *     description: |
 *       Step 1 - Government ID: upload a photo of ID (front only). PNG or JPG, max 5MB.
 *       Step 2 - Selfie: the image **must** be a photo snapped live on the device (e.g. front camera), not a pre-existing file. This is required for identity verification.
 *       Returns file_url and file_name for use in Submit (Step 3).
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PNG or JPG, max 5MB. For type=selfie, must be a live-captured selfie (snapped on device).
 *               type:
 *                 type: string
 *                 enum: [id_front, selfie]
 *                 default: id_front
 *                 description: "id_front = Government ID image. selfie = live-captured selfie photo (snapped on device)."
 *     responses:
 *       200:
 *         description: File uploaded; use file_url in submit payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: "boolean" }
 *                 file_url: { type: "string" }
 *                 file_name: { type: "string" }
 *       400:
 *         description: No file or invalid type/size (PNG/JPG, 5MB max)
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/upload",
  validateToken,
  uploadKycFile.single("file"),
  uploadKycDocument,
);

/**
 * @openapi
 * /api/v1/kyc/submit:
 *   post:
 *     tags: [KYC]
 *     summary: Submit KYC (identity verification)
 *     description: Step 3 - Review & Submit. Send metadata plus file_urls from Step 1 & 2 (or from /upload).
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, government_id_type, id_number, phone_number, id_front, selfie]
 *             properties:
 *               full_name: { type: "string" }
 *               government_id_type: { type: "string", example: "national_id", description: "national_id, drivers_license, passport" }
 *               id_number: { type: "string" }
 *               phone_number: { type: "string" }
 *               id_front:
 *                 type: object
 *                 required: [file_url]
 *                 properties:
 *                   file_url: { type: "string" }
 *                   file_name: { type: "string" }
 *               selfie:
 *                 type: object
 *                 required: [file_url]
 *                 description: Must be a photo snapped live on the device (camera selfie), not a pre-uploaded image.
 *                 properties:
 *                   file_url: { type: "string" }
 *                   file_name: { type: "string" }
 *     responses:
 *       200:
 *         description: Documents submitted for review (verification usually takes 24-48 hours)
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
 *         description: KYC status for UI (not_started, pending, approved, rejected; status_display for labels like "Not Started", "Pending review")
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: "boolean" }
 *                 kyc:
 *                   type: object
 *                   properties:
 *                     submitted: { type: "boolean" }
 *                     status: { type: "string" }
 *                     status_display: { type: "string", description: "Not Started | Pending review | Verified | Rejected" }
 *                     phone_verified: { type: "boolean" }
 *                     submission_date: { type: "string", nullable: true }
 *                     review_date: { type: "string", nullable: true }
 *                     rejection_reason: { type: "string", nullable: true }
 *       401:
 *         description: Unauthorized
 */
router.get("/status", validateToken, getKycStatus);

export default router;

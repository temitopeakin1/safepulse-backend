import express from "express";
import { getKycStatus, submitKYC } from "../controllers/kycController";
import validateToken from "../middleware/validateTokenHandler";

const router = express.Router();

/**
 * Submit KYC (JSON + Base64 images)
 */
router.post("/submit", validateToken, submitKYC);
router.get("/status", validateToken, getKycStatus);

/**
 * Get logged-in user's KYC
 */
// router.get(
//   "/me",
//   validateToken,
//   getMyKYC
// );

export default router;

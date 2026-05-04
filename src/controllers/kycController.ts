import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import * as KYCModel from "../models/kycModel";
import { uploadKycBuffer } from "../utils/uploadToCloud";
import pool from "../config/db";

interface FileObject {
  file_url: string;
  file_name: string;
}

const KYC_UPLOAD_TYPES = ["id_front", "selfie"] as const;
type KycUploadType = (typeof KYC_UPLOAD_TYPES)[number];

/**
 * Step 1 & 2: Upload ID or selfie (multipart file).
 * For type=selfie, the client must send a photo snapped live on the device (camera), not a pre-existing file.
 * Returns { file_url, file_name } for use in Step 3 submit.
 */
export const uploadKycDocument = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ title: "Unauthorized", message: "No user found" });
      return;
    }
    if (!req.file?.buffer) {
      res.status(400).json({
        title: "Validation Error",
        message:
          "No file uploaded. Send a single file (PNG or JPG, max 5MB) as 'file'.",
      });
      return;
    }

    const type = (req.body?.type ?? req.query?.type ?? "id_front") as string;
    const uploadType: KycUploadType = KYC_UPLOAD_TYPES.includes(
      type as KycUploadType,
    )
      ? (type as KycUploadType)
      : "id_front";

    const folder = `kyc/${req.user.id}/${uploadType}`;
    const { url, publicId } = await uploadKycBuffer(req.file.buffer, folder);
    const file_name =
      req.file.originalname || publicId.split("/").pop() || "upload";

    res.status(200).json({
      success: true,
      file_url: url,
      file_name,
    });
  },
);

export const submitKYC = asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ title: "Unauthorized", message: "No user found" });
      return;
    }

    const user_id = req.user.id;

    const {
      full_name,
      government_id_type,
      id_number,
      phone_number,
      id_front,
      selfie,
    } = req.body as {
      full_name: string;
      government_id_type: string;
      id_number: string;
      phone_number: string;
      id_front: FileObject;
      selfie: FileObject;
    };

    if (
      !full_name ||
      !government_id_type ||
      !id_number ||
      !phone_number ||
      !id_front?.file_url ||
      !selfie?.file_url
    ) {
      res.status(400).json({
        title: "Validation Error",
        message:
          "full_name, government_id_type, id_number, phone_number, id_front and selfie are required",
      });
      return;
    }

    // Prevent duplicate KYC
    const existingKyc = await KYCModel.getKYCByUserId(user_id);
    if (existingKyc) {
      res
        .status(409)
        .json({ title: "Conflict", message: "KYC already submitted" });
      return;
    }

    // Create KYC record
    let kyc: any;
    try {
      kyc = await KYCModel.createKYC({
        user_id,
        full_name,
        government_id_type,
        id_number,
        phone_number,
        id_front_url: id_front.file_url,
        id_back_url: null,
        selfie_url: selfie.file_url,
      });
    } catch (err: any) {
      if (err?.code === "23505") {
        if (err?.constraint === "kyc_phone_unique") {
          res.status(409).json({
            title: "conflict",
            message: "Phone number already used for KYC",
          });
          return;
        }
        res.status(409).json({
          title: "Conflict",
          message: "This phone number of ID has already been used for KYC",
        });
        return;
      }

      throw err;
    }

    // Persist selfie as dashboard profile picture source-of-truth.
    await pool.query(
      "UPDATE users SET profile_picture = $1 WHERE id = $2",
      [selfie.file_url, user_id],
    );

    res.status(200).json({
      success: true,
      message:
        "Thank you for submitting your documents. We're reviewing your information and will notify you once verification is complete. This usually takes 24-48 hours.",
      kyc: {
        status: kyc.status,
        phone_verified: kyc.phone_verified,
        submission_date: kyc.submission_date,
      },
    });
  } catch (err: any) {
    console.error("Unexpected KYC error:", err);
    res.status(500).json({
      title: "Server Error",
      message: err.message || "An unexpected error occurred",
    });
  }
});

// kyc status endpoint
export const getKycStatus = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ title: "Unauthorized", message: "No user found" });
      return;
    }

    const user_id = req.user.id;

    const kyc = await KYCModel.getKYCByUserId(user_id);

    // No record yet — UI shows "Not Started"
    if (!kyc) {
      res.status(200).json({
        success: true,
        kyc: {
          submitted: false,
          status: "not_started",
          status_display: "Not Started",
          phone_verified: false,
          submission_date: null,
          review_date: null,
          rejection_reason: null,
        },
      });
      return;
    }

    // Record exists — map status for UI (Pending review, Verified, Rejected)
    const statusDisplay =
      kyc.status === "approved"
        ? "Verified"
        : kyc.status === "rejected"
          ? "Rejected"
          : "Pending review";
    res.status(200).json({
      success: true,
      kyc: {
        submitted: true,
        status: kyc.status,
        status_display: statusDisplay,
        phone_verified: kyc.phone_verified,
        submission_date: kyc.submission_date,
        review_date: kyc.review_date,
        rejection_reason: kyc.rejection_reason,
      },
    });
  },
);

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import * as KYCModel from "../models/kycModel";

interface FileObject {
  file_url: string;
  file_name: string;
}

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
      id_back,
      selfie,
    } = req.body as {
      full_name: string;
      government_id_type: string;
      id_number: string;
      phone_number: string;
      id_front: FileObject;
      id_back: FileObject;
      selfie: FileObject;
    };

    if (
      !full_name ||
      !government_id_type ||
      !id_number ||
      !phone_number ||
      !id_front?.file_url ||
      !id_back?.file_url ||
      !selfie?.file_url
    ) {
      res.status(400).json({
        title: "Validation Error",
        message: "All fields are required",
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
        id_back_url: id_back.file_url,
        selfie_url: selfie.file_url,
      });
    } catch (err: any) {
      if (err?.code === "23505") {
        if (err?.constraint === "kyc_phone_unique") {
          res
            .status(409)
            .json({
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

    res.status(200).json({
      success: true,
      message: "KYC details submitted successfully",
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

    // No record yet
    if (!kyc) {
      res.status(200).json({
        success: true,
        kyc: {
          submitted: false,
          status: "not_submitted",
          phone_verified: false,
          submission_date: null,
          review_date: null,
          rejection_reason: null,
        },
      });
      return;
    }

    // Record exists
    res.status(200).json({
      success: true,
      kyc: {
        submitted: true,
        status: kyc.status, // pending | approved | rejected
        phone_verified: kyc.phone_verified,
        submission_date: kyc.submission_date,
        review_date: kyc.review_date,
        rejection_reason: kyc.rejection_reason,
      },
    });
  },
);

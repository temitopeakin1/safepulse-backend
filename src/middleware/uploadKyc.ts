import multer from "multer";
import { KYC_MAX_FILE_SIZE } from "../utils/uploadToCloud";

const ALLOWED_MIMES = ["image/png", "image/jpeg", "image/jpg"];

const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    cb(new Error("Only PNG and JPG images are allowed (up to 5MB)"));
    return;
  }
  cb(null, true);
};

export const uploadKycFile = multer({
  storage,
  fileFilter,
  limits: { fileSize: KYC_MAX_FILE_SIZE },
});

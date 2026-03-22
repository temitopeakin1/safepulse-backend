import multer from "multer";
import { EVIDENCE_MAX_FILE_BYTES } from "../utils/uploadToCloud";

const ALLOWED_MIMES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "video/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "application/pdf",
];

const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    cb(
      new Error(
        "Evidence must be image (PNG, SVG, JPG), video (MP4), audio (MP3, WAV, M4A), or PDF (max 50MB each)",
      ),
    );
    return;
  }
  cb(null, true);
};

/** Use with .array("evidence", 10) — max 10 files per request. */
export const uploadIncidentEvidence = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: EVIDENCE_MAX_FILE_BYTES,
    files: 10,
  },
});

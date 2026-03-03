import { constants } from "../constants";
import { Request, Response, NextFunction } from "express";

interface MulterError extends Error {
  code?: string;
}

const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Cloudinary missing config (e.g. "Must supply api_key")
  if (
    err.message?.includes("api_key") ||
    err.message?.includes("Cloudinary is not configured")
  ) {
    return res.status(503).json({
      title: "Service Unavailable",
      message:
        "File upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the server .env file.",
    });
  }

  const multerErr = err as MulterError;
  if (multerErr.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      title: "Validation Error",
      message: "File too large. KYC images must be PNG or JPG, max 5MB.",
    });
  }
  if (
    multerErr.code === "LIMIT_UNEXPECTED_FILE" ||
    err.message?.includes("PNG and JPG")
  ) {
    return res.status(400).json({
      title: "Validation Error",
      message:
        err.message ||
        "Invalid file. Use field 'file' and upload PNG or JPG, max 5MB.",
    });
  }

  const statusCode = res.statusCode || 500;

  switch (statusCode) {
    case constants.VALIDATION_ERROR:
      return res.status(statusCode).json({
        title: "Validation Failed",
        message: err.message,
      });

    case constants.UNAUTHORIZED:
      return res.status(statusCode).json({
        title: "Unauthorized",
        message: err.message,
      });

    case constants.FORBIDDEN:
      return res.status(statusCode).json({
        title: "Forbidden",
        message: err.message,
      });

    case constants.NOT_FOUND:
      return res.status(statusCode).json({
        title: "Not Found",
        message: err.message,
      });
    case constants.CONFLICT:
      return res.status(statusCode).json({
        title: "Conflict",
        message: err.message,
      });
    default:
      return res.status(500).json({
        title: "Server Error",
        message: err.message,
      });
  }
};

export default errorHandler;

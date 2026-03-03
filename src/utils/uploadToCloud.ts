import { Readable } from "stream";
import cloudinary, { requireCloudinaryConfig } from "./cloudinary";

const MAX_KYC_FILE_BYTES = 5 * 1024 * 1024; // 5MB per design

export const uploadBase64 = async (
  base64: string,
  folder: string,
): Promise<string> => {
  try {
    if (!base64.startsWith("data:")) {
      throw new Error("Invalid base64 file: must start with 'data:'");
    }

    const res = await cloudinary.uploader.upload(base64, {
      folder,
      resource_type: "auto",
      access_mode: "authenticated",
      max_bytes: 10 * 1024 * 1024,
    });

    console.log(`Cloudinary upload successful: ${res.secure_url}`);
    return res.secure_url;
  } catch (err: unknown) {
    console.error("Cloudinary upload failed. Full error:", err);
    const message =
      err instanceof Error ? err.message : "Cloudinary upload failed";
    throw new Error(message);
  }
};

/**
 * Upload a file buffer (e.g. from multer) to Cloudinary.
 * Used for KYC: PNG/JPG, max 5MB.
 */
export const uploadKycBuffer = async (
  buffer: Buffer,
  folder: string,
  options?: { resource_type?: "image" },
): Promise<{ url: string; publicId: string }> => {
  requireCloudinaryConfig();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: options?.resource_type ?? "image",
        max_bytes: MAX_KYC_FILE_BYTES,
      },
      (err, result) => {
        if (err) {
          reject(new Error(err.message || "Upload failed"));
          return;
        }
        if (!result?.secure_url) {
          reject(new Error("No URL returned from upload"));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id ?? "" });
      },
    );
    const readStream = Readable.from(buffer);
    readStream.pipe(stream);
  });
};

export const KYC_MAX_FILE_SIZE = MAX_KYC_FILE_BYTES;

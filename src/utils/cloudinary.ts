import { v2 as cloudinary } from "cloudinary";

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
const api_key = process.env.CLOUDINARY_API_KEY;
const api_secret = process.env.CLOUDINARY_API_SECRET;

if (cloud_name && api_key && api_secret) {
  cloudinary.config({ cloud_name, api_key, api_secret });
}

export default cloudinary;

/** Call before uploads; throws if Cloudinary is not configured. */
export function requireCloudinaryConfig(): void {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.",
    );
  }
}

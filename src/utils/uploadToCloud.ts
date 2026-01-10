import cloudinary from "../utils/cloudinary";

export const uploadBase64 = async (
  base64: string,
  folder: string
): Promise<string> => {
  try {
    if (!base64.startsWith("data:")) {
      throw new Error("Invalid base64 file: must start with 'data:'");
    }

    const res = await cloudinary.uploader.upload(base64, {
      folder,
      resource_type: "auto",
      access_mode: "authenticated",
      max_bytes: 10 * 1024 * 1024, // 10 MB
    });

    console.log(`Cloudinary upload successful: ${res.secure_url}`);
    return res.secure_url;
  } catch (err: any) {
    console.error("Cloudinary upload failed. Full error:", err);

    // Forward Cloudinary's message if available
    const message =
      err?.message || err?.error?.message || "Cloudinary upload failed";

    throw new Error(message);
  }
};

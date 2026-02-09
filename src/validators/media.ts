import { z } from "zod";

/**
 * Reusable validation for image/media strings: accepts a URL (http/https) or a data URI (base64).
 * Use for any field that accepts an image URL or inline base64 (e.g. evidence, KYC docs, avatars).
 */
export const mediaString = z
  .string()
  .min(5, "Media string is too short")
  .refine(
    (v) =>
      v.startsWith("http://") ||
      v.startsWith("https://") ||
      v.startsWith("data:"),
    "Media must be a URL (http/https) or a data URI (base64)"
  );

/** Optional media string (URL or base64). Use when the field can be omitted. */
export const mediaStringOptional = mediaString.optional();

/** Array of media strings (URLs or base64). Use for multiple images/files. */
export const mediaStringArray = z.array(mediaString).optional().default([]);

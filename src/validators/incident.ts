import { z } from "zod";
import { mediaString } from "./media";

const severitySchema = z.enum(["critical", "high", "medium", "low"]);

const allowedEvidenceTypes = [
  "png",
  "svg",
  "jpg",
  "jpeg",
  "mp4",
  "mp3",
  "wav",
  "m4a",
  "pdf",
] as const;
const evidenceItemSchema = z.object({
  file_url: mediaString,
  file_name: z.string().optional(),
  file_type: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        allowedEvidenceTypes.includes(
          val.toLowerCase() as (typeof allowedEvidenceTypes)[number],
        ),
      { message: "Evidence file_type must be one of: PNG, SVG, JPG, MP4, MP3, WAV, M4A, PDF" },
    ),
});

export const createIncidentSchema = z
  .object({
    incident_type: z.string().min(1, "Incident type is required"),
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    location: z.string().min(1, "Location is required"),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    severity: severitySchema,
    evidence: z.array(evidenceItemSchema).optional().default([]),
    witness_count: z.number().int().min(0).optional().default(0),
  })
  .strict()
  .refine(
    (data) =>
      (data.evidence && data.evidence.length > 0) || (data.witness_count ?? 0) >= 1,
    {
      message:
        "Unverified claim — please add at least one of: photo, video, audio, document, or witness count.",
    },
  );

export const verifyIncidentSchema = z
  .object({
    status: z.enum(["verified", "unverified", "under_review"]),
    review_notes: z.string().optional(),
    rejection_reason: z.string().optional(),
  })
  .strict();

export const listIncidentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  type: z.string().optional(),
  severity: severitySchema.optional(),
  location: z.string().optional(),
  search: z.string().optional(),
  scope: z.enum(["public", "all"]).optional().default("all"),
});

export const screeningIncidentSchema = z
  .object({
    result: z.enum(["pending", "passed", "flagged"]),
    notes: z.string().optional(),
  })
  .strict();

export const validateIncidentSchema = z
  .object({
    validator_type: z.enum([
      "moderator",
      "ngo",
      "journalist",
      "legal_observer",
    ]),
    validator_id: z.string().optional(),
    validator_name: z.string().optional(),
  })
  .strict();

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type VerifyIncidentInput = z.infer<typeof verifyIncidentSchema>;
export type ListIncidentsQuery = z.infer<typeof listIncidentsQuerySchema>;

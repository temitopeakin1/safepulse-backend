import { z } from "zod";
import { mediaString } from "./media";

const severitySchema = z.enum(["critical", "high", "medium", "low"]);

const allowedEvidenceTypes = ["png", "svg", "jpg", "jpeg", "mp4"] as const;
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
      { message: "Evidence file_type must be one of: PNG, SVG, JPG, MP4" },
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
  })
  .strict();

export const verifyIncidentSchema = z
  .object({
    status: z.enum(["verified", "unverified"]),
  })
  .strict();

export const listIncidentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  type: z.string().optional(),
  severity: severitySchema.optional(),
  location: z.string().optional(),
  search: z.string().optional(),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type VerifyIncidentInput = z.infer<typeof verifyIncidentSchema>;
export type ListIncidentsQuery = z.infer<typeof listIncidentsQuerySchema>;

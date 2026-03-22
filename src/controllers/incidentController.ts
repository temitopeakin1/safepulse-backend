import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { z } from "zod";
import * as IncidentModel from "../models/incidentModel";
import * as ReporterProfileModel from "../models/reporterProfileModel";
import * as IncidentValidationModel from "../models/incidentValidationModel";
import {
  createIncidentSchema,
  verifyIncidentSchema,
  listIncidentsQuerySchema,
  screeningIncidentSchema,
  validateIncidentSchema,
} from "../validators/incident";
import { formatZodError } from "../utils/validate";
import { uploadEvidenceBuffer } from "../utils/uploadToCloud";
import * as EvidenceAnalysisModel from "../models/evidenceAnalysisModel";
import { enqueueEvidenceAnalysis } from "../queues/evidenceAnalysisQueue";

const timeAgo = (date: Date) => {
  const diffMs = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
};

const parseEvidence = (evidence: any): any[] => {
  if (evidence == null) return [];
  if (Array.isArray(evidence)) return evidence;
  if (typeof evidence === "string") {
    try {
      return JSON.parse(evidence);
    } catch {
      return [];
    }
  }
  return [];
};

const derivePublicTitle = (row: any) =>
  row.public_title ??
  `Reported ${row.incident_type} in ${row.location} — ${row.status}`;

const buildReviewHistory = (row: any) => {
  const evidence = parseEvidence(row.evidence);
  const history: { stage: string; result?: string; at?: string; by?: string; notes?: string }[] = [
    { stage: "submission", at: row.created_at },
  ];
  if (row.ai_screened_at) {
    history.push({
      stage: "ai_screening",
      result: row.ai_screening_result ?? undefined,
      at: row.ai_screened_at,
      notes: row.ai_notes ?? undefined,
    });
  }
  if (row.reviewed_at) {
    history.push({
      stage: "human_review",
      result: row.status,
      at: row.reviewed_at,
      by: row.reviewed_by ?? undefined,
      notes: row.review_notes ?? undefined,
    });
  }
  return history;
};

const toIncidentResponse = (
  row: any,
  options?: { usePublicDisplay?: boolean },
) => {
  const usePublic = options?.usePublicDisplay === true;
  const title = usePublic ? derivePublicTitle(row) : row.title;
  const description = usePublic ? row.public_description ?? null : row.description;
  const evidence = parseEvidence(row.evidence);
  return {
    id: row.id,
    incidentId: `#${String(row.id).padStart(8, "0")}`,
    incident_type: row.incident_type,
    title,
    description,
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    severity: row.severity,
    status: row.status,
    evidence,
    evidence_count: evidence.length,
    witness_count: row.witness_count ?? 0,
    public_title: row.public_title ?? derivePublicTitle(row),
    public_description: row.public_description ?? null,
    review_history: buildReviewHistory(row),
    created_at: row.created_at,
    timeAgo: timeAgo(row.created_at),
  };
};

// POST /api/incidents/evidence/upload — upload evidence files; returns URLs for use in createIncident
export const uploadIncidentEvidence = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Unauthorized");
    }
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) {
      res.status(400);
      throw new Error(
        "No files uploaded. Send one or more files (SVG, PNG, JPG, MP4) using field 'evidence'.",
      );
    }
    const userId = (req.user as any).id;
    const folder = `incidents/evidence/${userId}`;
    const evidence: {
      file_url: string;
      file_name?: string;
      file_type?: string;
    }[] = [];
    for (const file of files) {
      const ext = file.originalname?.split(".").pop()?.toLowerCase() ?? "";
      const { url } = await uploadEvidenceBuffer(file.buffer, folder);
      evidence.push({
        file_url: url,
        file_name: file.originalname || undefined,
        file_type: ext || undefined,
      });
    }
    res.status(200).json({
      success: true,
      evidence,
    });
  },
);

// POST /api/incidents — create/report incident (Report Incidents in sidebar)
export const createIncident = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Unauthorized");
    }
    const body = req.validated as z.infer<typeof createIncidentSchema>;
    const userId = (req.user as any).id;
    if (!userId || typeof userId !== "string") {
      res.status(401);
      throw new Error("Invalid user");
    }
    const blocked = await ReporterProfileModel.isBlockedFromReporting(userId);
    if (blocked) {
      res.status(403);
      throw new Error(
        "You are blocked from reporting due to previous false or invalid reports.",
      );
    }
    await ReporterProfileModel.getOrCreateReporterProfile(userId);
    const trustLevel =
      await ReporterProfileModel.getTrustLevel(userId);
    const incident = await IncidentModel.createIncident({
      user_id: userId,
      incident_type: body.incident_type,
      title: body.title,
      description: body.description,
      location: body.location,
      latitude: body.latitude,
      longitude: body.longitude,
      severity: body.severity,
      evidence: body.evidence,
      witness_count: body.witness_count,
      reporter_trust_level_at_submission: trustLevel,
    });
    if (body.evidence && body.evidence.length > 0) {
      await EvidenceAnalysisModel.createPendingRows(incident.id, body.evidence);
      await IncidentModel.setIncidentScreening(
        incident.id,
        "pending",
        "Evidence analysis queued",
      );
      for (const item of body.evidence) {
        await enqueueEvidenceAnalysis({
          incidentId: incident.id,
          fileUrl: item.file_url,
          fileType: item.file_type,
        });
      }
    }
    res.status(201).json({
      success: true,
      message: "Incident reported successfully",
      incident: toIncidentResponse(incident),
    });
  },
);

// GET /api/incidents — list + filters + pagination (Recent Incident Log table)
export const listIncidents = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = listIncidentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400);
      throw new Error(formatZodError(parsed.error));
    }
    const { page, limit, type, severity, location, search, scope } =
      parsed.data;
    const { incidents, total } = await IncidentModel.findAllIncidents({
      page,
      limit,
      type,
      severity,
      location,
      search,
      scope,
    });
    res.status(200).json({
      success: true,
      incidents: incidents.map((row) =>
        toIncidentResponse(row, { usePublicDisplay: scope === "public" }),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
);

// GET /api/incidents/:id — incident detail (modal/row click)
export const getIncidentById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400);
      throw new Error("Invalid incident ID");
    }
    const scope =
      req.query.scope === "public" ? ("public" as const) : ("all" as const);
    const incident = await IncidentModel.findIncidentById(id);
    if (!incident) {
      res.status(404);
      throw new Error("Incident not found");
    }
    const confirmationCount =
      await IncidentModel.getConfirmationCount(id);
    const validations =
      await IncidentValidationModel.getValidationsForIncident(id);
    const incidentResponse = toIncidentResponse(incident, {
      usePublicDisplay: scope === "public",
    });
    res.status(200).json({
      success: true,
      incident: {
        ...incidentResponse,
        confirmation_count: confirmationCount,
        validations: validations.map((v) => ({
          validator_type: v.validator_type,
          validator_name: v.validator_name ?? "Trusted partner",
          validated_at: v.validated_at,
        })),
      },
    });
  },
);

// GET /api/incidents/map — map markers (Home/Incidents map view)
export const getMapMarkers = asyncHandler(
  async (req: Request, res: Response) => {
    const severity = req.query.severity as string | undefined;
    const location = req.query.location as string | undefined;
    const scope =
      req.query.scope === "public"
        ? ("public" as const)
        : ("all" as const);
    const validSeverity =
      severity && ["critical", "high", "medium", "low"].includes(severity)
        ? (severity as IncidentModel.Severity)
        : undefined;
    const markers = await IncidentModel.getMapMarkers({
      severity: validSeverity,
      location,
      scope,
    });
    const usePublicDisplay = scope === "public";
    res.status(200).json({
      success: true,
      markers: markers.map((m: any) => ({
        id: m.id,
        incident_type: m.incident_type,
        title: usePublicDisplay
          ? (m.public_title ?? `Reported ${m.incident_type} in ${m.location} — ${m.status}`)
          : m.title,
        location: m.location,
        latitude: m.latitude,
        longitude: m.longitude,
        severity: m.severity,
        status: m.status,
        timeAgo: timeAgo(m.created_at),
      })),
    });
  },
);

// POST /api/incidents/:id/validate — record NGO/journalist validation (trusted roles)
export const validateIncident = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Unauthorized");
    }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400);
      throw new Error("Invalid incident ID");
    }
    const incident = await IncidentModel.findIncidentById(id);
    if (!incident) {
      res.status(404);
      throw new Error("Incident not found");
    }
    const body = req.validated as z.infer<typeof validateIncidentSchema>;
    const userId = (req.user as any).id;
    const validation = await IncidentValidationModel.addValidation({
      incident_id: id,
      validator_type: body.validator_type as IncidentValidationModel.ValidatorType,
      validator_id: body.validator_id ?? userId,
      validator_name: body.validator_name,
    });
    res.status(201).json({
      success: true,
      message: "Validation recorded",
      validation: {
        id: validation.id,
        validator_type: validation.validator_type,
        validator_name: validation.validator_name ?? "Trusted partner",
        validated_at: validation.validated_at,
      },
    });
  },
);

// POST /api/incidents/:id/confirm — confirm you witnessed this incident (crowd verification)
export const confirmIncident = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Unauthorized");
    }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400);
      throw new Error("Invalid incident ID");
    }
    const incident = await IncidentModel.findIncidentById(id);
    if (!incident) {
      res.status(404);
      throw new Error("Incident not found");
    }
    const userId = (req.user as any).id;
    const result = await IncidentModel.addWitnessConfirmation(id, userId);
    const confirmationCount = await IncidentModel.getConfirmationCount(id);
    res.status(200).json({
      success: true,
      message:
        result === "created"
          ? "Thank you for confirming you witnessed this incident."
          : "You had already confirmed this incident.",
      confirmation_count: confirmationCount,
    });
  },
);

// PATCH /api/incidents/:id/screening — set AI screening result (internal/AI service)
export const setIncidentScreening = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400);
      throw new Error("Invalid incident ID");
    }
    const body = req.validated as z.infer<typeof screeningIncidentSchema>;
    const incident = await IncidentModel.setIncidentScreening(
      id,
      body.result as IncidentModel.ScreeningResult,
      body.notes,
    );
    if (!incident) {
      res.status(404);
      throw new Error("Incident not found");
    }
    res.status(200).json({
      success: true,
      message: "Screening result updated",
      incident: toIncidentResponse(incident),
    });
  },
);

// GET /api/incidents/:id/evidence-analysis — internal transparency for moderation dashboards
export const getIncidentEvidenceAnalysis = asyncHandler(
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400);
      throw new Error("Invalid incident ID");
    }
    const incident = await IncidentModel.findIncidentById(id);
    if (!incident) {
      res.status(404);
      throw new Error("Incident not found");
    }
    const rows = await EvidenceAnalysisModel.getIncidentEvidenceAnalysis(id);
    res.status(200).json({
      success: true,
      incident_id: id,
      ai_screening_result: incident.ai_screening_result ?? "pending",
      ai_screened_at: incident.ai_screened_at ?? null,
      ai_notes: incident.ai_notes ?? null,
      evidence_analysis: rows,
    });
  },
);

// POST /api/incidents/:id/verify — verify toggle (role-protected later)
export const verifyIncident = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Unauthorized");
    }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400);
      throw new Error("Invalid incident ID");
    }
    const body = req.validated as z.infer<typeof verifyIncidentSchema>;
    const userId = (req.user as any)?.id;
    const options =
      body.status === "verified"
        ? { reviewed_by: userId, review_notes: body.review_notes }
        : body.status === "unverified" && body.rejection_reason
          ? { rejection_reason: body.rejection_reason }
          : undefined;
    const incident = await IncidentModel.setIncidentStatus(id, body.status, options);
    if (!incident) {
      res.status(404);
      throw new Error("Incident not found");
    }
    if (body.status === "verified" && incident.user_id) {
      await ReporterProfileModel.getOrCreateReporterProfile(incident.user_id);
      await ReporterProfileModel.recordVerifiedReport(incident.user_id);
    }
    let message = `Incident ${body.status}`;
    if (
      body.status === "unverified" &&
      body.rejection_reason &&
      incident.user_id
    ) {
      await ReporterProfileModel.getOrCreateReporterProfile(incident.user_id);
      const { blocked } =
        await ReporterProfileModel.recordRejectedReport(incident.user_id);
      if (blocked) {
        message =
          "Incident unverified. Reporter has been blocked from submitting further reports due to repeated rejections.";
      }
    }
    res.status(200).json({
      success: true,
      message,
      incident: toIncidentResponse(incident),
    });
  },
);

// GET /api/incidents/export — download/export (Download button)
export const exportIncidents = asyncHandler(
  async (req: Request, res: Response) => {
    const type = req.query.type as string | undefined;
    const severity = req.query.severity as string | undefined;
    const location = req.query.location as string | undefined;
    const search = req.query.search as string | undefined;
    const scope =
      req.query.scope === "public"
        ? ("public" as const)
        : ("all" as const);
    const format = (req.query.format as string) || "json";
    const validSeverity =
      severity && ["critical", "high", "medium", "low"].includes(severity)
        ? (severity as IncidentModel.Severity)
        : undefined;

    const rows = await IncidentModel.getIncidentsForExport({
      type,
      severity: validSeverity,
      location,
      search,
      scope,
    });

    const usePublicDisplay = scope === "public";
    const titleFor = (r: any) =>
      usePublicDisplay
        ? (r.public_title ?? `Reported ${r.incident_type} in ${r.location} — ${r.status}`)
        : (r.title || "");

    if (format === "csv") {
      const header =
        "id,incident_type,title,location,severity,status,created_at\n";
      const csvRows = rows.map(
        (r: any) =>
          `${r.id},"${(r.incident_type || "").replace(/"/g, '""')}","${(titleFor(r)).replace(/"/g, '""')}","${(r.location || "").replace(/"/g, '""')}",${r.severity},${r.status},${r.created_at}`,
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=incidents.csv",
      );
      res.status(200).send(header + csvRows.join("\n"));
      return;
    }

    res.status(200).json({
      success: true,
      total: rows.length,
      incidents: rows.map((r: any) =>
        usePublicDisplay
          ? {
              ...r,
              title: titleFor(r),
              description: r.public_description ?? null,
            }
          : r,
      ),
    });
  },
);

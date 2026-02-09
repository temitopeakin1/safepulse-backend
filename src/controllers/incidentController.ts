import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { z } from "zod";
import * as IncidentModel from "../models/incidentModel";
import {
  createIncidentSchema,
  verifyIncidentSchema,
  listIncidentsQuerySchema,
} from "../validators/incident";
import { formatZodError } from "../utils/validate";

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

const toIncidentResponse = (row: any) => ({
  id: row.id,
  incidentId: `#${String(row.id).padStart(8, "0")}`,
  incident_type: row.incident_type,
  title: row.title,
  description: row.description,
  location: row.location,
  latitude: row.latitude,
  longitude: row.longitude,
  severity: row.severity,
  status: row.status,
  evidence: parseEvidence(row.evidence),
  created_at: row.created_at,
  timeAgo: timeAgo(row.created_at),
});

// POST /api/incidents — create/report incident (Report Incidents in sidebar)
export const createIncident = asyncHandler(async (req: Request, res: Response) => {
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
  });
  res.status(201).json({
    success: true,
    message: "Incident reported successfully",
    incident: toIncidentResponse(incident),
  });
});

// GET /api/incidents — list + filters + pagination (Recent Incident Log table)
export const listIncidents = asyncHandler(async (req: Request, res: Response) => {
  const parsed = listIncidentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400);
    throw new Error(formatZodError(parsed.error));
  }
  const { page, limit, type, severity, location, search } = parsed.data;
  const { incidents, total } = await IncidentModel.findAllIncidents({
    page,
    limit,
    type,
    severity,
    location,
    search,
  });
  res.status(200).json({
    success: true,
    incidents: incidents.map(toIncidentResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /api/incidents/:id — incident detail (modal/row click)
export const getIncidentById = asyncHandler(async (req: Request, res: Response) => {
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
  res.status(200).json({
    success: true,
    incident: toIncidentResponse(incident),
  });
});

// GET /api/incidents/map — map markers (Home/Incidents map view)
export const getMapMarkers = asyncHandler(async (req: Request, res: Response) => {
  const severity = req.query.severity as string | undefined;
  const location = req.query.location as string | undefined;
  const validSeverity =
    severity && ["critical", "high", "medium", "low"].includes(severity)
      ? (severity as IncidentModel.Severity)
      : undefined;
  const markers = await IncidentModel.getMapMarkers({
    severity: validSeverity,
    location,
  });
  res.status(200).json({
    success: true,
    markers: markers.map((m: any) => ({
      id: m.id,
      incident_type: m.incident_type,
      title: m.title,
      location: m.location,
      latitude: m.latitude,
      longitude: m.longitude,
      severity: m.severity,
      status: m.status,
      timeAgo: timeAgo(m.created_at),
    })),
  });
});

// POST /api/incidents/:id/verify — verify toggle (role-protected later)
export const verifyIncident = asyncHandler(async (req: Request, res: Response) => {
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
  const incident = await IncidentModel.setIncidentVerified(id, body.status);
  if (!incident) {
    res.status(404);
    throw new Error("Incident not found");
  }
  res.status(200).json({
    success: true,
    message: `Incident ${body.status}`,
    incident: toIncidentResponse(incident),
  });
});

// GET /api/incidents/export — download/export (Download button)
export const exportIncidents = asyncHandler(async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const severity = req.query.severity as string | undefined;
  const location = req.query.location as string | undefined;
  const search = req.query.search as string | undefined;
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
  });

  if (format === "csv") {
    const header = "id,incident_type,title,location,severity,status,created_at\n";
    const csvRows = rows.map(
      (r: any) =>
        `${r.id},"${(r.incident_type || "").replace(/"/g, '""')}","${(r.title || "").replace(/"/g, '""')}","${(r.location || "").replace(/"/g, '""')}",${r.severity},${r.status},${r.created_at}`
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=incidents.csv");
    res.status(200).send(header + csvRows.join("\n"));
    return;
  }

  res.status(200).json({
    success: true,
    total: rows.length,
    incidents: rows,
  });
});

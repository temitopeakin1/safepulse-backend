import express from "express";
import {
  createIncident,
  listIncidents,
  getIncidentById,
  getMapMarkers,
  verifyIncident,
  exportIncidents,
} from "../controllers/incidentController";
import validateToken from "../middleware/validateTokenHandler";
import { validateBody } from "../middleware/validateBody";
import {
  createIncidentSchema,
  verifyIncidentSchema,
} from "../validators/incident";

const router = express.Router();

/**
 * @openapi
 * /api/v1/incidents:
 *   post:
 *     tags: [Incidents]
 *     summary: Report a new incident
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [incident_type, title, location, severity]
 *             properties:
 *               incident_type: { type: string, example: "Traffic Collision" }
 *               title: { type: string, example: "Minivan stuck in street" }
 *               description: { type: string }
 *               location: { type: string, example: "Victoria Island Lagos" }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               severity: { type: string, enum: [critical, high, medium, low] }
 *               evidence:
 *                 type: array
 *                 description: Optional. Uploaded files (PNG, SVG, JPG, MP4). Send URLs after uploading to your storage.
 *                 items:
 *                   type: object
 *                   required: [file_url]
 *                   properties:
 *                     file_url: { type: string, format: uri, description: "URL of uploaded file" }
 *                     file_name: { type: string }
 *                     file_type: { type: string, enum: [png, svg, jpg, jpeg, mp4] }
 *     responses:
 *       201:
 *         description: Incident reported successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/",
  validateToken,
  validateBody(createIncidentSchema),
  createIncident,
);

/**
 * @openapi
 * /api/v1/incidents:
 *   get:
 *     tags: [Incidents]
 *     summary: List incidents with filters and pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *         description: Filter by incident_type
 *       - in: query
 *         name: severity
 *         schema: { type: string, enum: [critical, high, medium, low] }
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search in title, description, location
 *     responses:
 *       200:
 *         description: List of incidents with pagination
 */
router.get("/", listIncidents);

/**
 * @openapi
 * /api/v1/incidents/map:
 *   get:
 *     tags: [Incidents]
 *     summary: Get incident markers for map view
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema: { type: string, enum: [critical, high, medium, low] }
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of map markers (id, type, title, location, lat/lng, severity, status)
 */
router.get("/map", getMapMarkers);

/**
 * @openapi
 * /api/v1/incidents/export:
 *   get:
 *     tags: [Incidents]
 *     summary: Export incidents (JSON or CSV)
 *     parameters:
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, csv], default: json }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: severity
 *         schema: { type: string, enum: [critical, high, medium, low] }
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Exported incidents (JSON body or CSV download)
 */
router.get("/export", exportIncidents);

/**
 * @openapi
 * /api/v1/incidents/{id}:
 *   get:
 *     tags: [Incidents]
 *     summary: Get incident by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Incident details
 *       404:
 *         description: Incident not found
 */
router.get("/:id", getIncidentById);

/**
 * @openapi
 * /api/v1/incidents/{id}/verify:
 *   post:
 *     tags: [Incidents]
 *     summary: Set incident verification status (verified/unverified)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [verified, unverified] }
 *     responses:
 *       200:
 *         description: Incident status updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Incident not found
 */
router.post(
  "/:id/verify",
  validateToken,
  validateBody(verifyIncidentSchema),
  verifyIncident,
);

export default router;

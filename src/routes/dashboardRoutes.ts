import express from "express";
import {
  getDashboardActivity,
  getDashboardSummary,
} from "../controllers/dashboardController";

const router = express.Router();

/**
 * @openapi
 * /api/v1/dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get dashboard summary (public)
 *     description: No auth required. Used for Home cards and public visitors.
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string }
 *         description: Start date filter
 *       - in: query
 *         name: to
 *         schema: { type: string }
 *         description: End date filter
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *         description: City filter
 *     responses:
 *       200:
 *         description: Dashboard summary data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary: { type: object }
 */
router.get("/summary", getDashboardSummary);

/**
 * @openapi
 * /api/v1/dashboard/activity:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get dashboard activity / incidents list (public)
 *     description: No auth required. Used for Home activity feed and public visitors.
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string }
 *         description: Start date filter
 *       - in: query
 *         name: to
 *         schema: { type: string }
 *         description: End date filter
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *         description: City filter
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Max number of items to return
 *     responses:
 *       200:
 *         description: List of activity items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activity:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       incidentId: { type: string }
 *                       title: { type: string }
 *                       locationName: { type: string }
 *                       severity: { type: string }
 *                       status: { type: string }
 *                       timeAgo: { type: string }
 */
router.get("/activity", getDashboardActivity);

export default router;

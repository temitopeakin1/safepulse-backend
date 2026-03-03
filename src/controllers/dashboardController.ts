import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import * as DashboardModel from "../models/dashboardModel";

const timeAgo = (date: Date) => {
  const diffMs = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
};

export const getDashboardSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to, city } = req.query as {
      from?: string;
      to?: string;
      city?: string;
    };

    const summary = await DashboardModel.fetchDashboardSummary({
      from,
      to,
      city,
    });

    res.status(200).json({ summary });
  },
);

export const getDashboardActivity = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to, city, limit } = req.query as {
      from?: string;
      to?: string;
      city?: string;
      limit?: string;
    };

    const rows = await DashboardModel.fetchDashboardActivity({
      from,
      to,
      city,
      limit: limit ? Number(limit) : 10,
    });

    const activity = rows.map((r: any) => ({
      id: r.id,
      incidentId: r.incident_id,
      title: r.title,
      locationName: r.location,
      severity: r.severity,
      status: r.status,
      timeAgo: timeAgo(r.created_at),
    }));

    res.status(200).json({ activity });
  },
);

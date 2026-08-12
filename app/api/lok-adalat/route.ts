// ─────────────────────────────────────────────────────────────
//  GET /api/lok-adalat  —  Lok Adalat schedule for West Bengal
//
//  Query params:
//    district?: string  — filter by district (e.g., "Kolkata")
//    type?: string      — filter by type (National|State|District|Taluk|Mobile)
//    upcoming?: boolean — only upcoming sittings (default: true)
//
//  200: { entries: LokAdalatEntry[], total: number, filtered: number }
//  ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import {
  lokAdalatSchedule,
  getDistricts,
  getScheduleByDistrict,
  getUpcomingSchedule,
  type LokAdalatEntry,
} from "@/lib/lok-adalat-data";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const district = searchParams.get("district") || undefined;
  const type = searchParams.get("type") || undefined;
  const upcomingOnly = searchParams.get("upcoming") !== "false";

  let entries: LokAdalatEntry[] = upcomingOnly ? getUpcomingSchedule() : lokAdalatSchedule;

  if (district) {
    entries = entries.filter((e) => e.district === district);
  }

  if (type) {
    entries = entries.filter((e) => e.type === type);
  }

  const response = {
    entries,
    total: lokAdalatSchedule.length,
    filtered: entries.length,
    districts: getDistricts(),
    types: Array.from(new Set(lokAdalatSchedule.map((e) => e.type))),
    lastUpdated: new Date().toISOString(),
    source: "static-mock" as const,
    // Integration note: Replace with real data fetch from:
    // - DoJ Lok Adalat portal: https://www.doj.gov.in/lok-adalat/
    // - NALSA schedule API
    // - District Legal Services Authority (DLSA) feeds
    integrationNotes: {
      realDataSources: [
        "https://www.doj.gov.in/lok-adalat/",
        "https://nalsa.gov.in/lok-adalat-schedule",
        "State Legal Services Authority (SLSA) West Bengal",
        "District Legal Services Authority (DLSA) for each district",
      ],
      suggestedFields: [
        "date",
        "time",
        "court",
        "district",
        "type",
        "cases",
        "categories",
        "status",
        "notes",
        "registrationUrl",
        "contactPhone",
        "contactEmail",
      ],
      auth: "May require API key or government portal access",
    },
  };

  return NextResponse.json({
    ...response,
    // Cache for 1 hour in production
    cacheControl: "public, max-age=3600, stale-while-revalidate=86400",
  });
}
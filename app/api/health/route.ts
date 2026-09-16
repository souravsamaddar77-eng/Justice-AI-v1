import { NextResponse } from "next/server";
import { authConfigured, configured } from "@/lib/cases/server";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    services: {
      gemini: process.env.GEMINI_API_KEY ? "configured" : "not_configured",
      groq: process.env.GROQ_API_KEY ? "configured" : "not_configured",
      nemotron: process.env.NEMOTRON_API_KEY ? "configured" : "not_configured",
      ocr: process.env.OCR_SPACE_API_KEY ? "configured" : "not_configured",
      auth: authConfigured() ? "configured" : "setup_required",
      cases: configured() ? "configured" : "setup_required",
    },
  });
}

// ─────────────────────────────────────────────────────────────
//  POST /api/analyze-document  —  Legal notice analysis (Gemini)
//
//  Body:  { text, filename?, fileBase64? }
//  200:   { urgency, daysToRespond, deadlineDate, summary[],
//           keyTerms[], source }   source ∈ "gemini"|"mock"
//
//  Gemini is asked to return strict JSON; we validate/repair it.
//  Fallback: realistic heuristic mock.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { callGemini } from "@/lib/ai";
import { mockAnalyze } from "@/lib/mock-data";
import type { AnalyzeRequestBody, AnalyzeResponseBody, Urgency } from "@/types";
// Use pdfjs-dist legacy build for Node.js compatibility
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export const runtime = "nodejs";

/** Extract text from base64-encoded PDF buffer using pdfjs-dist. */
async function extractPdfText(base64: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64, "base64");
    const uint8Array = new Uint8Array(buffer);

    // Disable worker for server-side usage
    (pdfjs.GlobalWorkerOptions as any).workerSrc = undefined;

    const loadingTask = pdfjs.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText.trim();
  } catch (err) {
    console.warn("[/api/analyze-document] PDF extraction failed:", err instanceof Error ? err.message : err);
    return "";
  }
}

const SYSTEM = `You are Justice AI. Analyze an Indian legal notice and reply with ONLY a JSON object (no markdown, no prose). Schema:
{
  "urgency": "High" | "Medium" | "Low",
  "daysToRespond": number,
  "summary": [string, string, string],
  "keyTerms": string[]
}
Rules:
- urgency: High if criminal action/eviction/arrest or <7 day deadline; Medium if demand/reply needed within 30 days; Low otherwise.
- daysToRespond: statutory days remaining (default 15; 30 for tax; 21 for cheque-bounce 138).
- summary: exactly 3 short plain-language bullet strings (simple enough for a non-lawyer).
- keyTerms: up to 5 detected legal terms / sections.`;

export async function POST(req: Request) {
  let body: AnalyzeRequestBody & { fileBase64?: string };
  try {
    body = (await req.json()) as AnalyzeRequestBody & { fileBase64?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.text || "";
  const filename = body.filename || "";
  const fileBase64 = body.fileBase64 || "";

  let extractedText = text;

  // ── If PDF uploaded (base64), extract text server-side ──
  if (fileBase64 && /\.(pdf)$/i.test(filename)) {
    const pdfText = await extractPdfText(fileBase64);
    if (pdfText) {
      extractedText = pdfText;
    }
  }

  // ── Real path: Gemini ──
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const payload = extractedText.trim()
        ? extractedText
        : `Pretend this is a legal notice file named "${filename || "notice.pdf"}". Provide a reasonable default analysis.`;
      const raw = await callGemini([{ role: "user", text: payload }], SYSTEM);
      const parsed = extractJson(raw);
      if (parsed) {
        const out = normalize(parsed, false);
        return NextResponse.json(out);
      }
      console.warn("[/api/analyze-document] Gemini JSON unparseable → mock fallback");
    } catch (err) {
      console.error("[/api/analyze-document] Gemini failed → mock fallback:", err instanceof Error ? err.message : err);
    }
  }

  // ── Mock fallback ──
  const m = mockAnalyze(extractedText, filename);
  const out: AnalyzeResponseBody = { ...m, source: "mock" };
  return NextResponse.json(out);
}

/** Pull the first {...} JSON object out of a possibly-noisy string. */
function extractJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Validate + coerce a parsed object into a well-typed response. */
function normalize(p: Record<string, unknown>, _mockFlag: boolean): AnalyzeResponseBody {
  const urgencyRaw = String(p.urgency ?? "Medium");
  const urgency: Urgency = ["High", "Medium", "Low"].includes(urgencyRaw) ? (urgencyRaw as Urgency) : "Medium";

  const daysRaw = Number(p.daysToRespond);
  const daysToRespond = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.round(daysRaw) : 15;

  const summary = Array.isArray(p.summary)
    ? p.summary.map(String).slice(0, 3)
    : [];
  while (summary.length < 3) summary.push("No additional summary available.");

  const keyTerms = Array.isArray(p.keyTerms) ? p.keyTerms.map(String).slice(0, 5) : [];

  return {
    urgency,
    daysToRespond,
    deadlineDate: isoShort(daysToRespond),
    summary: summary.length ? summary : ["Analysis not available.", "", ""],
    keyTerms,
    source: "gemini",
  };
}

/** ISO short date y days from today. */
function isoShort(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────
//  POST /api/analyze-document  —  Legal notice analysis (Gemini)
//  with OCR.space integration for scanned PDFs/images
//
//  Body:  { text, filename?, fileBase64? }
//  200:   { urgency, daysToRespond, deadlineDate, summary[], keyTerms[], source }
//
import { NextResponse } from "next/server";
import { callGemini } from "@/lib/ai";
import { extractTextWithOcr } from "@/lib/ocr";
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

    // No worker needed for legacy build in Node.js

    const loadingTask = pdfjs.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .filter((str): str is string => typeof str === "string" && str.length > 0)
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

  // Initialize with provided text
  let extractedText = text;
  let extractionMethod: "none" | "native" | "ocr" = "none";
  let extractionError: string | null = null;

  // Debug: Log environment variables (remove in production)
  console.log('[DEBUG] OCR_SPACE_API_KEY present:', !!process.env.OCR_SPACE_API_KEY);
  console.log('[DEBUG] GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
  console.log('[DEBUG] File base64 length:', fileBase64?.length || 0);
  console.log('[DEBUG] Filename:', filename);

  // ── Process uploaded file if provided ─────────────────────────────────────
  if (fileBase64 && filename) {
    const ext = filename.split('.').pop()?.toLowerCase() ?? "";
    const isImage = ['jpg', 'jpeg', 'png', 'tiff', 'bmp', 'gif'].includes(ext);
    const isPdf = ext === 'pdf';

    console.log('[DEBUG] File extension:', ext);
    console.log('[DEBUG] Is image:', isImage);
    console.log('[DEBUG] Is PDF:', isPdf);

    if (isImage || isPdf) {
      try {
        // For now, always use OCR for PDFs and images
        console.log('[DEBUG] Calling OCR.space API for file');
        const ocrResult = await extractTextWithOcr(fileBase64, ext.toUpperCase());
        console.log('[DEBUG] OCR result:', ocrResult);
        if (!ocrResult.error && ocrResult.text.trim()) {
          extractedText = ocrResult.text;
          extractionMethod = "ocr";
          console.log('[DEBUG] OCR successful, text length:', extractedText.length);
        } else {
          extractionError = ocrResult.error || "OCR failed";
          console.log('[DEBUG] OCR failed:', extractionError);
        }
      } catch (err) {
        extractionError = err instanceof Error ? err.message : String(err);
        console.warn(`[/api/analyze-document] File processing error:`, extractionError);
      }
    }
  }

  // ── Real path: Gemini (using extracted text) ─────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && extractedText.trim()) {
    try {
      // Use the extracted text (from native, OCR, or body.text) for Gemini analysis
      const payload = extractedText.trim()
        ? extractedText
        : `Pretend this is a legal notice file named "${filename || "notice.pdf"}". Provide a reasonable default analysis.`;

      const raw = await callGemini([{ role: "user", text: payload }], SYSTEM);
      const parsed = extractJson(raw);
      if (parsed) {
        const out = normalize(parsed, false);
        // Optionally add extraction method to response for debugging
        // out.extractionMethod = extractionMethod;
        return NextResponse.json(out);
      }
      console.warn("[/api/analyze-document] Gemini JSON unparseable → mock fallback");
    } catch (err) {
      console.error("[/api/analyze-document] Gemini failed → mock fallback:", err instanceof Error ? err.message : err);
    }
  }

  // ── Mock fallback (missing key, real call failed, or no text extracted) ─────
  // Pass extraction info to mock data for better fallback responses
  const m = mockAnalyze(extractedText, filename, {
    extractionMethod,
    extractionError: extractionError ?? undefined,
    hasFile: !!fileBase64
  });
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

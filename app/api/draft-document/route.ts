// ─────────────────────────────────────────────────────────────
//  POST /api/draft-document  —  Legal drafting co-pilot (Nemotron)
//
//  Body:  { clientName, issue, date, documentType, additionalNotes? }
//  200:   { title, document, source }   source ∈ "nemotron"|"mock"
//
//  Security: NEMOTRON_API_KEY is read here on the server only.
//  Fallback: if the key is missing OR the call fails, return mock.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { callNemotron } from "@/lib/ai";
import { mockDraft } from "@/lib/mock-data";
import type { DraftRequestBody, DraftResponseBody } from "@/types";

export const runtime = "nodejs";

const TITLES: Record<string, string> = {
  bail_application: "Bail Application under Section 439 Cr.P.C.",
  reply_to_notice: "Reply to Legal Notice",
  affidavit: "Affidavit",
  legal_notice_draft: "Legal Notice",
};

const SYSTEM = `You are a precise Indian legal drafting assistant. Generate a well-structured formal Indian legal document in clean, numbered paragraphs. Use standard legal phrasing, include a PRAYER/operative clause where appropriate, but keep it general (no fabricated names beyond those supplied). Do NOT add commentary outside the document.`;

export async function POST(req: Request) {
  let body: DraftRequestBody;
  try {
    body = (await req.json()) as DraftRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const documentType = body.documentType || "legal_notice_draft";
  const clientName = body.clientName?.trim() || "";
  const issue = body.issue?.trim() || "";
  const date = body.date?.trim() || "";
  const additionalNotes = body.additionalNotes?.trim() || "";

  // ── Real path: Nemotron ──
  const apiKey = process.env.NEMOTRON_API_KEY;
  if (apiKey) {
    try {
      const userPrompt = [
        `Document type: ${documentType}`,
        `Client name: ${clientName || "(to be filled)"}`,
        `Issue / matter: ${issue || "(to be filled)"}`,
        `Date: ${date || "(today)"}`,
        additionalNotes ? `Additional notes: ${additionalNotes}` : "",
        "",
        "Draft the complete document now.",
      ].join("\n");

      const document = await callNemotron(
        [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        { temperature: 0.4, maxTokens: 1536 }
      );
      const out: DraftResponseBody = {
        title: TITLES[documentType] || "Legal Document",
        document,
        source: "nemotron",
      };
      return NextResponse.json(out);
    } catch (err) {
      console.error("[/api/draft-document] Nemotron failed → mock fallback:", err instanceof Error ? err.message : err);
    }
  }

  // ── Mock fallback ──
  const draft = mockDraft({ clientName, issue, date, documentType, additionalNotes });
  const out: DraftResponseBody = { ...draft, source: "mock" };
  return NextResponse.json(out);
}

// ─────────────────────────────────────────────────────────────
//  POST /api/chat  —  Justice AI chatbot (Gemini)
//
//  Body:  { message, history?, persona? }
//  200:   { reply, source }   where source ∈ "gemini"|"mock"
//
//  Security: GEMINI_API_KEY is read here on the server only.
//  Fallback: if the key is missing OR the call fails, return mock.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { callGemini } from "@/lib/ai";
import { mockChatReply } from "@/lib/mock-data";
import type { ChatRequestBody, ChatResponseBody } from "@/types";

export const runtime = "nodejs";

const PERSONA_INSTRUCTIONS: Record<string, string> = {
  citizen:
    "You are Justice AI, an assistant for ordinary Indian citizens. Explain legal concepts in very simple, plain language with short sentences. Always clarify that you are not a substitute for a lawyer and recommend consulting an advocate. Keep replies under 120 words.",
  advocate:
    "You are Justice AI, an assistant for Indian advocates. Provide concise, technically precise legal guidance referencing relevant statutes (IPC, BNS 2023, CrPC, BNSS). Keep replies under 160 words unless asked for detail.",
};

export async function POST(req: Request) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = (body.message || "").trim();
  if (!message) {
    return NextResponse.json({ error: "Missing 'message'" }, { status: 400 });
  }

  const persona = body.persona === "advocate" ? "advocate" : "citizen";

  // ── Real path: Gemini ──
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const history = (body.history || []).map((h) => ({
        role: h.role === "assistant" ? ("model" as const) : ("user" as const),
        text: h.content,
      }));
      const reply = await callGemini(
        [...history, { role: "user", text: message }],
        PERSONA_INSTRUCTIONS[persona]
      );
      const out: ChatResponseBody = { reply, source: "gemini" };
      return NextResponse.json(out);
    } catch (err) {
      console.error("[/api/chat] Gemini failed → mock fallback:", err instanceof Error ? err.message : err);
    }
  }

  // ── Mock fallback (missing key or real call failed) ──
  const reply = mockChatReply(message, persona);
  const out: ChatResponseBody = { reply, source: "mock" };
  return NextResponse.json(out);
}

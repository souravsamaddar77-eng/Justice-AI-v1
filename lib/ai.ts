// ─────────────────────────────────────────────────────────────
//  AI provider clients — server-only.
//  Using latest Google GenAI SDK (@google/genai) and NVIDIA Nemotron (OpenAI-compatible)
// ─────────────────────────────────────────────────────────────

import { GoogleGenAI } from "@google/genai";

/* ─────────── Google GenAI SDK (Gemini) ─────────── */

let googleAI: GoogleGenAI | null = null;

function getGoogleAI(): GoogleGenAI {
  if (!googleAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");
    googleAI = new GoogleGenAI({ apiKey });
  }
  return googleAI;
}

/**
 * Call Google Gemini using the new Google GenAI SDK.
 * @param messages - Array of {role: "user"|"model", text: string}
 * @param systemInstruction - Optional system prompt
 * @returns The model's plain-text reply
 */
export async function callGemini(
  messages: { role: "user" | "model"; text: string }[],
  systemInstruction = "You are Justice AI, a helpful Indian legal assistant."
): Promise<string> {
  const ai = getGoogleAI();
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-001";

  // Convert our message format to GenAI SDK format
  const contents = messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
      temperature: 0.4,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned empty content");
  return text.trim();
}

/* ─────────── Nemotron (NVIDIA, OpenAI-compatible) ─────────── */

export interface NemotronMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Call NVIDIA Nemotron via the OpenAI-compatible chat endpoint.
 * @returns The model's plain-text reply.
 */
export async function callNemotron(
  messages: NemotronMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const apiKey = process.env.NEMOTRON_API_KEY;
  const model = process.env.NEMOTRON_MODEL || "nvidia/llama-3.3-nemotron-super-49b-v1";
  if (!apiKey) throw new Error("NEMOTRON_API_KEY missing");

  const url = "https://integrate.api.nvidia.com/v1/chat/completions";

  const body = {
    model,
    messages,
    temperature: opts.temperature ?? 0.5,
    top_p: 0.9,
    max_tokens: opts.maxTokens ?? 1536,
    stream: false,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await safeText(res);
    throw new Error(`Nemotron HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Nemotron returned empty content");
  return text.trim();
}

/* ─────────── helpers ─────────── */

/** Safely read response text for error logging (never throws). */
async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<unreadable body>";
  }
}
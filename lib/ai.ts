/** Server-side text provider adapters. Never log credentials or document content. */
import { AIError, runProviders, type AIInput, type AIProvider, type ProviderId } from "./providers";
import type { ResponseLanguage } from "../types";
import { LEGAL_SCOPE_INSTRUCTIONS, validateLegalScopeResponse } from "./legal-scope";
export { AIError, type AIInput, type ProviderId } from "./providers";
const numeric = (name: string, fallback: number, max: number) => Math.min(max, Math.max(1, Number(process.env[name]) || fallback));
const names = { gemini: "Google Gemini", groq: "Groq", nemotron: "NVIDIA NIM" };
const keyNames = { gemini: "GEMINI_API_KEY", groq: "GROQ_API_KEY", nemotron: "NEMOTRON_API_KEY" };
export function getAIConfig() {
  const providers = (["gemini", ...(process.env.AI_FALLBACK_ENABLED === "false" ? [] : ["groq"])] as ProviderId[]).filter(id => Boolean(process.env[keyNames[id]]));
  return { providers: providers.map(id => ({ id, name: names[id] })), fallbackEnabled: process.env.AI_FALLBACK_ENABLED !== "false", fallbackConfigured: Boolean(process.env.GROQ_API_KEY) && process.env.AI_FALLBACK_ENABLED !== "false", configured: providers.length > 0 };
}
export function requireAIConfiguration() {
  if (!getAIConfig().configured) throw new AIError("setup", "AI is not configured. Add GEMINI_API_KEY and GROQ_API_KEY to the server environment.", false, 503);
}
const languageNames: Record<ResponseLanguage, string> = { en: "English", hi: "Hindi", bn: "Bengali", ta: "Tamil", te: "Telugu", mr: "Marathi", gu: "Gujarati", kn: "Kannada", ml: "Malayalam", pa: "Punjabi (Gurmukhi script)" };
export function languageInstruction(language: unknown, structured = false): string {
  const selected = language === undefined ? "en" : language;
  if (typeof selected !== "string" || !Object.hasOwn(languageNames, selected)) throw new AIError("input", "Choose a supported response language.", false, 400);
  const instruction = `Write your response in ${languageNames[selected as ResponseLanguage]}. Use clear plain text, without Markdown asterisks, bold markers or headings. Preserve supplied names, dates, numbers and citations accurately.`;
  return structured ? `${instruction} Return the required JSON object: keep JSON property names, urgency values High/Medium/Low, ISO dates, and null values exactly as specified. Translate only summary explanations and explanatory terms. Keep deadlineSource as an exact, untranslated excerpt of the document.` : instruction;
}
function modelFor(id: ProviderId, fallback: boolean) {
  const prefix = id.toUpperCase();
  const defaults: Record<ProviderId, string> = { gemini: "gemini-2.5-flash", groq: "llama-3.3-70b-versatile", nemotron: "nvidia/llama-3.3-nemotron-super-49b-v1" };
  return (fallback && process.env[`${prefix}_FALLBACK_MODEL`]) || process.env[`${prefix}_MODEL`] || defaults[id];
}
async function httpError(response: Response, id: ProviderId) {
  const status = response.status;
  // Inspect rejection classification without returning upstream text (it may echo a prompt).
  const detail = (await response.text().catch(() => "")).slice(0, 8000);
  if (/safety|content[_ -]?filter|prohibited|blocked.{0,30}(?:content|prompt)|policy.{0,20}(?:violation|violat)/i.test(detail)) return new AIError("safety", "The provider declined this request. Edit the request before trying again.", false, 422);
  if ([401, 403].includes(status)) return new AIError("credentials", "AI access is unavailable. Check the server credentials and model permissions.", false, 503);
  if ([400, 404, 422].includes(status)) return new AIError("configuration", "AI could not process this request. Check the configured model and input.", false, 503);
  const retry = [408, 409, 429].includes(status) || status >= 500;
  const header = response.headers.get("retry-after");
  const retryAfterMs = header ? (/^\d+$/.test(header) ? Number(header) * 1000 : Math.max(0, Date.parse(header) - Date.now())) : undefined;
  return new AIError(retry ? "unavailable" : "provider_error", "AI is temporarily unavailable. Your input is retained; please retry.", retry, 503, Number.isFinite(retryAfterMs) ? retryAfterMs : undefined);
}
type WireResponse = {
  error?: { code?: string | number; message?: string; type?: string };
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  choices?: { finish_reason?: string; message?: { content?: string; refusal?: string }; delta?: { content?: string; refusal?: string } }[];
};
function readPart(data: WireResponse, id: ProviderId): { text: string; done: boolean } {
  if (!data || typeof data !== "object") throw new AIError("malformed", "AI returned an invalid response.", true, 502);
  if (data.error) {
    if (/safety|content[_ -]?filter|prohibited|policy.{0,20}violation/i.test(`${data.error.type || ""} ${data.error.message || ""}`)) throw new AIError("safety", "The provider declined this request. Edit the request before trying again.", false, 422);
    throw new AIError("unavailable", "AI could not complete this response. Please retry.", true, 503);
  }
  if (id === "gemini") {
    const candidate = data.candidates?.[0];
    const finish = candidate?.finishReason;
    if (data.promptFeedback?.blockReason || (finish && ["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "IMAGE_SAFETY"].includes(finish))) throw new AIError("safety", "The provider declined this request. Edit the request before trying again.", false, 422);
    if (finish && finish !== "STOP") throw new AIError("incomplete", "The provider could not complete the answer. Reduce the request or retry.", true, 502);
    return { text: (candidate?.content?.parts || []).filter(p => !p.thought).map(p => p.text || "").join(""), done: finish === "STOP" };
  }
  const choice = data.choices?.[0];
  if (choice?.finish_reason === "content_filter" || choice?.message?.refusal || choice?.delta?.refusal) throw new AIError("safety", "The provider declined this request. Edit the request before trying again.", false, 422);
  if (choice?.finish_reason && choice.finish_reason !== "stop") throw new AIError("incomplete", "The provider could not complete the answer. Reduce the request or retry.", true, 502);
  return { text: choice?.delta?.content ?? choice?.message?.content ?? "", done: choice?.finish_reason === "stop" };
}
async function* streamSSE(response: Response): AsyncGenerator<WireResponse> {
  if (!response.body) throw new AIError("malformed", "Provider returned an empty stream.", true, 502);
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read(); buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split(/\r?\n/); buffer = lines.pop() || "";
      if (done && buffer) { lines.push(buffer); buffer = ""; }
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim(); if (!payload || payload === "[DONE]") continue;
        let parsed: WireResponse;
        try { parsed = JSON.parse(payload) as WireResponse; } catch { throw new AIError("malformed", "Provider returned an invalid stream.", true, 502); }
        yield parsed;
      }
      if (done) break;
      if (buffer.length > 1_000_000) throw new AIError("malformed", "Provider stream exceeded the supported size.", false, 502);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
function makeProvider(id: ProviderId, fallback: boolean): AIProvider | null {
  const key = process.env[keyNames[id]]; if (!key) return null;
  const model = modelFor(id, fallback);
  return { id, model, capabilities: ["text", "stream"], async generate(input, signal, onDelta) {
    const streaming = Boolean(onDelta); const maxTokens = input.maxTokens || numeric("AI_MAX_OUTPUT_TOKENS", 2048, 8192);
    const url = id === "gemini" ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${streaming ? "streamGenerateContent?alt=sse" : "generateContent"}` : id === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : "https://integrate.api.nvidia.com/v1/chat/completions";
    const body = id === "gemini" ? {
      systemInstruction: { parts: [{ text: input.system }] }, contents: input.messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens, ...(input.json ? { responseMimeType: "application/json" } : {}) },
    } : { model, messages: [{ role: "system", content: input.system }, ...input.messages], temperature: 0.4, ...(id === "groq" ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }), stream: streaming, ...(input.json ? { response_format: { type: "json_object" } } : {}) };
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(id === "gemini" ? { "x-goog-api-key": key } : { Authorization: `Bearer ${key}` }) }, body: JSON.stringify(body), signal, cache: "no-store" });
    if (!response.ok) throw await httpError(response, id);
    if (!streaming) {
      let data: WireResponse;
      try { data = await response.json() as WireResponse; } catch { throw new AIError("malformed", "Provider returned invalid JSON.", true, 502); }
      const part = readPart(data, id); if (!part.done) throw new AIError("incomplete", "The provider returned an incomplete answer.", true, 502);
      return part.text;
    }
    let text = ""; let finished = false;
    for await (const data of streamSSE(response)) {
      const part = readPart(data, id); if (part.text) { text += part.text; onDelta?.(part.text); } finished ||= part.done;
      if (text.length > 100_000) throw new AIError("malformed", "Provider output exceeded the supported size.", false, 502);
    }
    if (!finished) throw new AIError("incomplete", "The response was interrupted. Your input and partial output are retained; retry to start a new response.", true, 502);
    return text;
  } };
}
export async function generateAI(input: AIInput & { primary: ProviderId }) {
  // Public features use Gemini -> Groq. An explicit legacy NVIDIA caller remains supported.
  const alternate: ProviderId = input.primary === "gemini" ? "groq" : "gemini";
  const providers = [makeProvider(input.primary, false), ...(process.env.AI_FALLBACK_ENABLED === "false" ? [] : [makeProvider(alternate, true)])].filter((p): p is AIProvider => Boolean(p));
  const guardedInput = {
    ...input,
    system: `${input.system}\n\n${LEGAL_SCOPE_INSTRUCTIONS}`,
    validate: (text: string) => { validateLegalScopeResponse(text, input.json); input.validate?.(text); },
  };
  const result = await runProviders(guardedInput, providers, {
    attemptTimeoutMs: numeric("AI_ATTEMPT_TIMEOUT_MS", 12000, 60000), deadlineMs: numeric("AI_REQUEST_TIMEOUT_MS", 28000, 90000),
    retries: Math.min(1, Math.max(0, Number(process.env.AI_RETRIES ?? 1))), cooldownMs: numeric("AI_COOLDOWN_MS", 30000, 300000),
  });
  result.metadata.fallback = result.metadata.provider !== input.primary;
  return result;
}
export function aiErrorResponse(error: unknown) {
  const safe = error instanceof AIError ? error : new AIError("unavailable", "AI could not complete this request. Your input is retained; try again.", true, 503);
  return Response.json({ error: safe.message, code: safe.code, retryable: safe.retryable }, { status: safe.status, headers: { "Cache-Control": "no-store" } });
}

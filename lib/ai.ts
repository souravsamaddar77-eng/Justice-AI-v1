/** Server-side text provider adapters. Never log credentials or document content. */
import { AIError, runProviders, type AIInput, type AIProvider, type ProviderId } from "./providers";
export { AIError, type AIInput, type ProviderId } from "./providers";
const numeric = (name: string, fallback: number, max: number) => Math.min(max, Math.max(1, Number(process.env[name]) || fallback));
const names = { gemini: "Google Gemini", nemotron: "NVIDIA NIM" };
export function getAIConfig() {
  const providers = (["gemini", "nemotron"] as const).filter(id => Boolean(process.env[id === "gemini" ? "GEMINI_API_KEY" : "NEMOTRON_API_KEY"]));
  return { providers: providers.map(id => ({ id, name: names[id] })), fallbackEnabled: process.env.AI_FALLBACK_ENABLED !== "false", configured: providers.length > 0 };
}
export function requireAIConsent(body: { mode?: string; consent?: { providers?: unknown } }) {
  if (body.mode === "demo") return;
  const configured = getAIConfig();
  if (!configured.configured) throw new AIError("setup", "Live AI is not configured. Add a provider key or choose the labelled demo.", false, 503);
  const consented = body.consent?.providers;
  if (!Array.isArray(consented) || !configured.providers.every(p => consented.includes(p.id))) throw new AIError("consent", "Review and accept the listed external AI processors before sending material.", false, 428);
}
function modelFor(id: ProviderId, fallback: boolean) {
  const prefix = id === "gemini" ? "GEMINI" : "NEMOTRON";
  return (fallback && process.env[`${prefix}_FALLBACK_MODEL`]) || process.env[`${prefix}_MODEL`] || (id === "gemini" ? "gemini-2.0-flash-001" : "nvidia/llama-3.3-nemotron-super-49b-v1");
}
async function httpError(response: Response, id: ProviderId) {
  const status = response.status;
  // Inspect rejection classification without returning upstream text (it may echo a prompt).
  const detail = (await response.text().catch(() => "")).slice(0, 8000);
  if (/safety|content[_ -]?filter|prohibited|blocked.{0,30}(?:content|prompt)|policy.{0,20}(?:violation|violat)/i.test(detail)) return new AIError("safety", "The provider declined this request. Edit the request before trying again.", false, 422);
  if ([401, 403].includes(status)) return new AIError("credentials", `${names[id]} rejected its credentials or access permission. Check server configuration.`, false, 503);
  if ([400, 404, 422].includes(status)) return new AIError("configuration", `${names[id]} rejected the request or configured model. Check model availability and input.`, false, 503);
  const retry = status === 429 || [500, 502, 503, 504].includes(status);
  const header = response.headers.get("retry-after");
  const retryAfterMs = header ? (/^\d+$/.test(header) ? Number(header) * 1000 : Math.max(0, Date.parse(header) - Date.now())) : undefined;
  return new AIError(retry ? "unavailable" : "provider_error", `${names[id]} is temporarily unavailable (HTTP ${status}).`, retry, 503, retryAfterMs);
}
type WireResponse = {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  choices?: { finish_reason?: string; message?: { content?: string; refusal?: string }; delta?: { content?: string; refusal?: string } }[];
};
function readPart(data: WireResponse, id: ProviderId): { text: string; done: boolean } {
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
  const key = process.env[id === "gemini" ? "GEMINI_API_KEY" : "NEMOTRON_API_KEY"]; if (!key) return null;
  const model = modelFor(id, fallback);
  return { id, model, capabilities: ["text", "stream"], async generate(input, signal, onDelta) {
    const streaming = Boolean(onDelta); const maxTokens = input.maxTokens || numeric("AI_MAX_OUTPUT_TOKENS", 2048, 8192);
    const url = id === "gemini" ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${streaming ? "streamGenerateContent?alt=sse" : "generateContent"}` : "https://integrate.api.nvidia.com/v1/chat/completions";
    const body = id === "gemini" ? {
      systemInstruction: { parts: [{ text: input.system }] }, contents: input.messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens, ...(input.json ? { responseMimeType: "application/json" } : {}) },
    } : { model, messages: [{ role: "system", content: input.system }, ...input.messages], temperature: 0.4, max_tokens: maxTokens, stream: streaming };
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
  const alternate: ProviderId = input.primary === "gemini" ? "nemotron" : "gemini";
  const providers = [makeProvider(input.primary, false), ...(process.env.AI_FALLBACK_ENABLED === "false" ? [] : [makeProvider(alternate, true)])].filter((p): p is AIProvider => Boolean(p));
  const result = await runProviders(input, providers, {
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

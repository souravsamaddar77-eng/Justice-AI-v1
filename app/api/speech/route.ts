import { isLanguage } from "@/lib/i18n";
import { SPEECH_CHUNK_LENGTH } from "@/lib/chat-speech";

export const runtime = "nodejs";
export const maxDuration = 60;
const MAX_AUDIO_BYTES = 4_000_000;
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function POST(request: Request) {
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 5000) return Response.json({ error: "Speech request is too long." }, { status: 413, headers });
    body = JSON.parse(raw);
  } catch { return Response.json({ error: "Invalid speech request." }, { status: 400, headers }); }
  if (!body || typeof body !== "object" || !("text" in body) || typeof body.text !== "string" || !body.text.trim() || body.text.length > SPEECH_CHUNK_LENGTH || !("language" in body) || !isLanguage(body.language)) {
    return Response.json({ error: "Choose a supported language and a short passage to read." }, { status: 400, headers });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: "Server read-aloud is not configured." }, { status: 503, headers });
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST", cache: "no-store",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(35000)]),
      body: JSON.stringify({
        model: "gemini-3.8-flash-lite-tts",
        input: [{ type: "user_input", content: [{ type: "text", text: body.text.trim(), annotations: [{ type: "speech_metadata", style: `Read clearly and naturally in language ${body.language}.` }] }] }],
        response_format: { type: "audio" },
        generation_config: { speech_config: [{ voice: "Kore" }] },
        store: false,
      }),
    });
    // Do not expose upstream errors, which may contain the submitted reply.
    if (!response.ok) return Response.json({ error: "Read-aloud is temporarily unavailable. Please retry." }, { status: 503, headers });
    const data = await response.json() as { status?: string; steps?: { type?: string; content?: { type?: string; mime_type?: string; data?: string }[] }[] };
    const parts = data.steps?.filter(step => step.type === "model_output").flatMap(step => step.content ?? []).filter(part => part.type === "audio") ?? [];
    if (data.status !== "completed" || parts.length !== 1 || parts[0].mime_type !== "audio/wav" || !parts[0].data || parts[0].data.length > Math.ceil(MAX_AUDIO_BYTES / 3) * 4) throw new Error("Invalid audio response");
    const audio = Buffer.from(parts[0].data, "base64");
    if (audio.length < 44 || audio.length > MAX_AUDIO_BYTES || audio.toString("ascii", 0, 4) !== "RIFF" || audio.toString("ascii", 8, 12) !== "WAVE") throw new Error("Invalid WAV audio");
    return new Response(audio, { headers: { ...headers, "Content-Type": "audio/wav", "Content-Length": String(audio.length) } });
  } catch {
    return Response.json({ error: "Read-aloud could not finish. Please retry." }, { status: request.signal.aborted ? 499 : 503, headers });
  }
}

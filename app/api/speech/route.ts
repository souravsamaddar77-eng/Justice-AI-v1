import { isLanguage } from "@/lib/i18n";
import { SPEECH_CHUNK_LENGTH } from "@/lib/chat-speech";
import { geminiSpeechAudio } from "@/lib/speech-audio";

export const runtime = "nodejs";
export const maxDuration = 60;
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
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(35000)]);
    let response: Response | undefined;
    let format: "pcm" | "wav" = "wav";
    const models = ["gemini-3.8-flash-lite-tts", "gemini-2.5-flash-preview-tts"];
    for (const model of models) {
      format = model === "gemini-2.5-flash-preview-tts" ? "pcm" : "wav";
      try {
        const endpoint = format === "pcm" ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` : "https://generativelanguage.googleapis.com/v1beta/interactions";
        response = await fetch(endpoint, {
          method: "POST", cache: "no-store",
          headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
          signal,
          body: JSON.stringify(format === "pcm" ? {
            contents: [{ parts: [{ text: `Read this text aloud exactly as written in language ${body.language}:\n\n${body.text.trim()}` }] }],
            generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } } },
          } : {
            model,
            input: [{ type: "user_input", content: [{ type: "text", text: body.text.trim(), annotations: [{ type: "speech_metadata", style: `Read clearly and naturally in language ${body.language}.` }] }] }],
            response_format: { type: "audio" },
            generation_config: { speech_config: [{ voice: "Kore" }] },
            store: false,
          }),
        });
      } catch (error) {
        if (signal.aborted || model === models.at(-1)) throw error;
        continue;
      }
      if (response.ok || (response.status !== 429 && response.status < 500)) break;
    }
    // Do not expose upstream errors, which may contain the submitted reply.
    if (!response?.ok) {
      if (response?.status === 429) {
        const retry = response.headers.get("Retry-After") ?? "60";
        const seconds = /^\d+$/.test(retry) ? Math.min(86400, Math.max(1, Number(retry))) : 60;
        return Response.json({ error: "Read-aloud has reached its usage limit. Please try later.", code: "rate_limited" }, { status: 429, headers: { ...headers, "Retry-After": String(seconds) } });
      }
      return Response.json({ error: "Read-aloud is temporarily unavailable. Please retry." }, { status: 503, headers });
    }
    const audio = geminiSpeechAudio(await response.json(), format);
    return new Response(new Uint8Array(audio), { headers: { ...headers, "Content-Type": "audio/wav", "Content-Length": String(audio.length) } });
  } catch {
    return Response.json({ error: "Read-aloud could not finish. Please retry." }, { status: request.signal.aborted ? 499 : 503, headers });
  }
}

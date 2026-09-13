/** OCR.space runs on the server, with multipart file bytes and sanitized failures. */
export class ExtractionError extends Error {
  constructor(public code: string, message: string, public status = 422, public retryable = false) { super(message); this.name = "ExtractionError"; }
}
export interface OcrResult { text: string; pages: string[]; error?: string }
export function getOCRSettings() {
  const engine = process.env.OCR_SPACE_ENGINE || "2";
  const language = process.env.OCR_SPACE_LANGUAGE || "eng";
  const endpoint = process.env.OCR_SPACE_ENDPOINT || "https://api.ocr.space/parse/image";
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new ExtractionError("configuration", "OCR endpoint configuration is invalid.", 503); }
  if (url.protocol !== "https:" || !(url.hostname === "ocr.space" || url.hostname.endsWith(".ocr.space")) || url.username || url.password || url.search || !/^\/parse\/image\/?$/i.test(url.pathname)) throw new ExtractionError("configuration", "Configure an HTTPS OCR.space parse/image endpoint matching your plan.", 503);
  if (!["2", "3"].includes(engine) || !["eng", "auto", "chs", "cht"].includes(language)) throw new ExtractionError("configuration", "Use OCR engine 2 or 3 and a supported setting: eng, auto, chs or cht. Use auto with engine 3 for other languages and verify the result.", 503);
  return { engine, language, endpoint: url.toString(), timeoutMs: Math.min(20000, Math.max(1000, Number(process.env.OCR_TIMEOUT_MS) || 12000)), maxBytes: Math.min(10 * 1024 * 1024, Math.max(10000, Number(process.env.OCR_MAX_FILE_BYTES) || 1024 * 1024)), maxPages: Math.min(20, Math.max(1, Number(process.env.OCR_MAX_PAGES) || 3)) };
}
interface WireOCR { OCRExitCode?: number | string; IsErroredOnProcessing?: boolean; ErrorMessage?: string | string[]; ErrorDetails?: string; ParsedResults?: { ParsedText?: string; FileParseExitCode?: number | string; ErrorMessage?: string }[] }
function providerFailure(data: WireOCR) {
  const results = Array.isArray(data.ParsedResults) ? data.ParsedResults : [];
  const detail = [data.ErrorMessage, data.ErrorDetails, ...results.map(p => p?.ErrorMessage)].flat().join(" ");
  if (/api.?key|unauthori[sz]ed|invalid.?key/i.test(detail)) return new ExtractionError("credentials", "OCR.space rejected the configured key. Check the server key and plan endpoint.", 503);
  if (/limit|too (?:large|many)|maximum|quota/i.test(detail)) return new ExtractionError("limit", "OCR.space reached a file, page or quota limit. Check the configured plan limits or retry later.", 429, true);
  if (/timeout|timed out/i.test(detail) || results.some(p => Number(p?.FileParseExitCode) === -20)) return new ExtractionError("timeout", "OCR.space could not finish in time. Retry or paste the text manually.", 504, true);
  return new ExtractionError("ocr_failed", "OCR.space could not extract every requested page. The original upload is retained; retry or enter the text manually.", 422, true);
}
export async function ocrFile(bytes: Uint8Array, mime: string, filename: string, signal?: AbortSignal): Promise<OcrResult> {
  const settings = getOCRSettings(); const key = process.env.OCR_SPACE_API_KEY;
  if (!key) throw new ExtractionError("setup", "OCR.space is not configured. Add its server key, upload a digital PDF or paste the text manually.", 503);
  if (!bytes.length || bytes.length > settings.maxBytes) throw new ExtractionError("limit", `This scan exceeds the configured OCR upload limit (${Math.round(settings.maxBytes / 1024)} KB). Use a smaller scan or paste text.`, 413);
  const controller = new AbortController(); const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true }); if (signal?.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort(), settings.timeoutMs);
  try {
    const form = new FormData();
    form.set("file", new Blob([Buffer.from(bytes)], { type: mime }), filename);
    form.set("language", settings.language); form.set("OCREngine", settings.engine); form.set("isOverlayRequired", "false"); form.set("scale", "true"); form.set("detectOrientation", "true");
    const response = await fetch(settings.endpoint, { method: "POST", headers: { apikey: key }, body: form, signal: controller.signal, cache: "no-store" });
    if (!response.ok) {
      await response.body?.cancel();
      if ([401, 403].includes(response.status)) throw new ExtractionError("credentials", "OCR.space rejected its key or plan access. Check server configuration.", 503);
      if (response.status === 429) throw new ExtractionError("rate_limit", "OCR.space is rate limited. Retry later; your upload is retained.", 429, true);
      throw new ExtractionError("http", `OCR.space is unavailable (HTTP ${response.status}). Retry or paste text.`, 503, true);
    }
    let data: WireOCR;
    try { data = await response.json(); } catch { throw new ExtractionError("malformed", "OCR.space returned an unreadable response. Please retry.", 502, true); }
    if (!data || data.IsErroredOnProcessing || Number(data.OCRExitCode) !== 1 || !Array.isArray(data.ParsedResults) || !data.ParsedResults.length || data.ParsedResults.some(p => !p || Number(p.FileParseExitCode) !== 1)) throw providerFailure(data || {});
    const pages = data.ParsedResults.map(p => typeof p.ParsedText === "string" ? p.ParsedText.trim() : "");
    if (!pages.some(Boolean)) throw new ExtractionError("empty", "No readable text was found. Retry with a clearer scan or paste its text.", 422, true);
    return { text: pages.join("\n\n"), pages };
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    if (controller.signal.aborted) throw new ExtractionError(signal?.aborted ? "cancelled" : "timeout", signal?.aborted ? "Extraction cancelled. Your upload is retained." : "OCR.space timed out. Your upload is retained; retry or paste text.", signal?.aborted ? 499 : 504, !signal?.aborted);
    throw new ExtractionError("network", "Could not connect to OCR.space. Your upload is retained; retry or paste text.", 503, true);
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", onAbort); }
}
/** Backwards-compatible helper. Raw base64 and data URIs both become valid multipart files. */
export async function extractTextWithOcr(base64: string, filetype = "PNG", signal?: AbortSignal): Promise<OcrResult> {
  const types: Record<string, string> = { PDF: "application/pdf", PNG: "image/png", JPG: "image/jpeg", JPEG: "image/jpeg" };
  const mime = types[filetype.toUpperCase()];
  if (!mime) throw new ExtractionError("unsupported", "OCR supports PDF, PNG and JPEG uploads.", 415);
  return ocrFile(new Uint8Array(Buffer.from(base64.replace(/^data:[^;]+;base64,/, ""), "base64")), mime, `scan.${filetype.toLowerCase()}`, signal);
}

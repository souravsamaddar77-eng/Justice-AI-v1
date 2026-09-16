import { AIError, aiErrorResponse, generateAI, languageInstruction, requireAIConfiguration } from "@/lib/ai";
import { extractDocument, ExtractionError } from "@/lib/extraction";
import { DRAFT_REVIEW_PROMPT, parseDraftReview } from "@/lib/draft-review";

export const runtime = "nodejs";
export const maxDuration = 60;
const MAX_BODY = 2_850_000;

export async function POST(request: Request) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) controller.abort();
  const timer = setTimeout(abort, 55000);
  try {
    if (Number(request.headers.get("content-length")) > MAX_BODY) throw new AIError("input", "Choose a file up to 2 MB.", false, 413);
    const raw = await request.text();
    if (raw.length > MAX_BODY) throw new AIError("input", "Choose a file up to 2 MB.", false, 413);
    let body;
    try { body = JSON.parse(raw); } catch { throw new AIError("input", "Invalid JSON body.", false, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body) ||
      (body.text !== undefined && typeof body.text !== "string") ||
      (body.fileBase64 !== undefined && typeof body.fileBase64 !== "string") ||
      (body.filename !== undefined && (typeof body.filename !== "string" || body.filename.length > 180))) {
      throw new AIError("input", "Provide draft text or a supported document.", false, 400);
    }
    const language = languageInstruction(body.language);
    let text = (body.text || "").trim();
    if (text && body.fileBase64) throw new AIError("input", "Choose either pasted text or a file for this review.", false, 400);
    if (!text && !body.fileBase64) throw new AIError("input", "Paste draft text or select a file.", false, 400);
    if (text.length > 50000) throw new AIError("input", "Review up to 50,000 characters at a time.", false, 413);
    requireAIConfiguration();
    let method: "pasted" | "native" | "ocr" | "mixed" = "pasted";
    let pageCount: number | null = null;
    if (body.fileBase64) {
      if (!body.filename?.trim()) throw new AIError("input", "The upload needs its original filename.", false, 400);
      const encoded = body.fileBase64.replace(/^data:[^;]+;base64,/, "");
      if (!encoded || encoded.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new AIError("input", "The file encoding is invalid. Select it again.", false, 400);
      const bytes = new Uint8Array(Buffer.from(encoded, "base64"));
      if (bytes.length > 2 * 1024 * 1024) throw new AIError("input", "Choose a file up to 2 MB.", false, 413);
      const extraction = await extractDocument({ bytes, filename: body.filename, allowOCR: true, signal: controller.signal });
      text = extraction.text; method = extraction.method; pageCount = extraction.pages.length;
    }
    if (!text.trim()) throw new AIError("input", "No readable draft text was found.", false, 422);
    if (text.length > 50000) throw new AIError("input", "The extracted draft exceeds 50,000 characters. Split the file or paste a selection.", false, 413);
    const generated = await generateAI({ primary: "gemini", system: `${DRAFT_REVIEW_PROMPT}\n${language}`,
      messages: [{ role: "user", content: text }], json: true, maxTokens: 6500, signal: controller.signal,
      validate: output => { parseDraftReview(output, text); } });
    return Response.json({ ...parseDraftReview(generated.text, text), documentText: text,
      filename: body.filename || "Pasted draft", extractionMethod: method, pageCount,
      source: generated.metadata.provider, metadata: generated.metadata }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ExtractionError) return Response.json({ error: error.message, code: error.code, retryable: error.retryable }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    return aiErrorResponse(error);
  } finally { clearTimeout(timer); request.signal.removeEventListener("abort", abort); }
}

import { createHash } from "node:crypto";
import path from "node:path";
import pdfPackage from "pdfjs-dist/package.json";
import canvasPackage from "@napi-rs/canvas/package.json";
import { ExtractionError, getOCRSettings, ocrFile } from "./ocr";
import { validateFile } from "./cases/validation";
export { ExtractionError } from "./ocr";
export interface ExtractionPage { page: number; text: string; method: "native" | "ocr" }
export interface ExtractionResult { text: string; pages: ExtractionPage[]; method: "native" | "ocr" | "mixed"; config: string; sha256: string }
export function getExtractionConfig(): string {
  const { engine, language, endpoint, maxBytes, maxPages } = getOCRSettings();
  return "extraction-v3-" + createHash("sha256").update(JSON.stringify({ parser: pdfPackage.version, render: canvasPackage.version, threshold: 40, bundledFonts: true, engine, language, endpoint, maxBytes, maxPages })).digest("hex").slice(0, 20);
}
function checkSignal(signal: AbortSignal) { if (signal.aborted) throw new ExtractionError("cancelled", "Extraction stopped. Your original upload is retained.", 499, true); }
export async function extractDocument(input: { bytes: Uint8Array; filename: string; signal?: AbortSignal; allowOCR?: boolean }, dependencies: { ocr?: typeof ocrFile } = {}): Promise<ExtractionResult> {
  let validated: ReturnType<typeof validateFile>;
  try { validated = validateFile(input.bytes, input.filename); } catch (error) { throw new ExtractionError("invalid_file", error instanceof Error ? error.message : "Invalid file.", 415); }
  const config = getExtractionConfig(); const settings = getOCRSettings(); const ocr = dependencies.ocr || ocrFile;
  const controller = new AbortController(); const onAbort = () => controller.abort(); input.signal?.addEventListener("abort", onAbort, { once: true }); if (input.signal?.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort(), 22000); const signal = controller.signal;
  try {
    checkSignal(signal);
    const pages: ExtractionPage[] = [];
    if (validated.mime === "text/plain") pages.push({ page: 1, text: new TextDecoder("utf-8", { fatal: true }).decode(input.bytes).trim(), method: "native" });
    else if (validated.mime === "application/pdf") {
      let pdf: import("pdfjs-dist").PDFDocumentProxy | undefined;
      let loading: import("pdfjs-dist").PDFDocumentLoadingTask | undefined;
      let abortPDF: (() => void) | undefined;
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        // pdfjs-dist stays external to Next's bundle. Its default worker path then
        // resolves relative to the installed PDF.js module in both dev and production.
        const assets = path.join(process.cwd(), "node_modules", "pdfjs-dist").replaceAll("\\", "/");
        loading = pdfjs.getDocument({ data: new Uint8Array(input.bytes), cMapUrl: `${assets}/cmaps/`, cMapPacked: true, standardFontDataUrl: `${assets}/standard_fonts/`, wasmUrl: `${assets}/wasm/`, useSystemFonts: false, verbosity: 0, stopAtErrors: true });
        abortPDF = () => { void loading?.destroy(); }; signal.addEventListener("abort", abortPDF, { once: true });
        pdf = await loading.promise; checkSignal(signal);
        if (pdf.numPages > 40) throw new ExtractionError("page_limit", "Extract up to 40 PDF pages at a time. Split the document or enter selected text.", 413);
        let scanned = 0;
        for (let number = 1; number <= pdf.numPages; number++) {
          checkSignal(signal); const page = await pdf.getPage(number); const content = await page.getTextContent();
          const text = content.items.map(item => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join("").trim();
          if (text.replace(/\s/g, "").length >= 40) pages.push({ page: number, text, method: "native" });
          else {
            // Completely blank vector pages do not need an external processor.
            const operators = await page.getOperatorList();
            const hasImage = operators.fnArray.some(op => [pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject, pdfjs.OPS.paintImageMaskXObject].includes(op));
            if (!hasImage && text) pages.push({ page: number, text, method: "native" });
            else if (!hasImage && operators.fnArray.length < 3) pages.push({ page: number, text: "", method: "native" });
            else {
              if (!input.allowOCR) throw new ExtractionError("consent", "This PDF includes scans. Accept OCR.space processing before extracting them.", 428);
              if (++scanned > settings.maxPages) throw new ExtractionError("page_limit", `This document exceeds the configured ${settings.maxPages}-page OCR limit. Check the plan or extract a smaller selection.`, 413);
              const { createCanvas } = await import("@napi-rs/canvas"); const base = page.getViewport({ scale: 1 });
              const scale = Math.min(2, Math.sqrt(4_000_000 / Math.max(1, base.width * base.height))); const viewport = page.getViewport({ scale });
              const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
              const task = page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D, viewport });
              const cancelRender = () => task.cancel(); signal.addEventListener("abort", cancelRender, { once: true });
              try { await task.promise; } finally { signal.removeEventListener("abort", cancelRender); }
              const image = canvas.toBuffer("image/jpeg", 85); canvas.width = 1; canvas.height = 1;
              const result = await ocr(new Uint8Array(image), "image/jpeg", `page-${number}.jpg`, signal);
              if (result.pages.length !== 1) throw new ExtractionError("page_count", "OCR returned an unexpected page count. Please retry.", 502, true);
              pages.push({ page: number, text: result.text, method: "ocr" });
            }
          }
          page.cleanup();
        }
      } catch (error) {
        if (error instanceof ExtractionError) throw error;
        if (signal.aborted) throw new ExtractionError("timeout", "PDF extraction stopped or reached its time limit. Retry with fewer pages or paste text.", 504, true);
        if (error instanceof Error && error.name === "PasswordException") throw new ExtractionError("encrypted", "This PDF is password protected. Upload an unlocked copy or paste its text.", 422);
        throw new ExtractionError("pdf_invalid", "The PDF could not be read or rendered. It may be corrupt or unsupported; upload a readable copy or paste its text.", 422);
      } finally { if (abortPDF) signal.removeEventListener("abort", abortPDF); await loading?.destroy().catch(() => {}); }
    } else {
      if (!input.allowOCR) throw new ExtractionError("consent", "Accept OCR.space processing before extracting an image.", 428);
      const { loadImage } = await import("@napi-rs/canvas");
      try { const image = await loadImage(Buffer.from(input.bytes)); if (image.width * image.height > 16_000_000) throw new Error(); } catch { throw new ExtractionError("invalid_image", "The image is corrupt or exceeds 16 million pixels. Upload a smaller readable image.", 422); }
      const result = await ocr(input.bytes, validated.mime, input.filename, signal);
      if (result.pages.length !== 1) throw new ExtractionError("page_count", "OCR returned an unexpected page count. Please retry.", 502, true);
      pages.push({ page: 1, text: result.text, method: "ocr" });
    }
    checkSignal(signal); const text = pages.map(page => `[Page ${page.page}]\n${page.text}`).join("\n\n");
    if (!pages.some(page => page.text.trim())) throw new ExtractionError("empty", "No readable text was found. Retry with a clearer document or enter text manually.", 422, true);
    if (text.length > 500_000) throw new ExtractionError("text_limit", "The extracted text is too long. Use a smaller document or selected pages.", 413);
    const methods = new Set(pages.map(p => p.method));
    return { text, pages, method: methods.size > 1 ? "mixed" : pages[0].method, config, sha256: validated.sha256 };
  } finally { clearTimeout(timer); input.signal?.removeEventListener("abort", onAbort); }
}

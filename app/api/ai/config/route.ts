import { getAIConfig } from "@/lib/ai";
import { getExtractionConfig } from "@/lib/extraction";
export const dynamic = "force-dynamic";
export async function GET() {
  let extractionConfig: string | null = null;
  try { extractionConfig = getExtractionConfig(); } catch { /* Invalid OCR configuration does not disable unrelated text tools. */ }
  return Response.json({ ...getAIConfig(), extractionConfig, ocr: { name: "OCR.space", configured: Boolean(process.env.OCR_SPACE_API_KEY) } }, { headers: { "Cache-Control": "no-store" } });
}

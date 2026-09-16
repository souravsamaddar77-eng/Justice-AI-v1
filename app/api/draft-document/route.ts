import { AIError, aiErrorResponse, generateAI, languageInstruction } from "@/lib/ai";
import { aiStreamResponse } from "@/lib/ai-stream";
import type { DraftRequestBody } from "@/types";
export const runtime = "nodejs";
const TITLES: Record<string, string> = { bail_application: "Bail Application — AI Draft", reply_to_notice: "Reply to Legal Notice", affidavit: "Affidavit", legal_notice_draft: "Legal Notice" };
const SYSTEM = "You are an Indian legal drafting assistant. Generate a formal document in numbered paragraphs with an appropriate prayer/operative clause. Use only supplied facts. Mark missing details with clear placeholders. Do not invent parties, laws, cases or deadlines. Applicable IPC/BNS and CrPC/BNSS provisions must be checked against the facts and dates; mark uncertain provisions for advocate review. The output is an unreviewed AI draft. Do not add commentary outside the document.";
export async function POST(req: Request) {
  let body: DraftRequestBody;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }
  try {
    if (!body || !Object.hasOwn(TITLES, body.documentType) || typeof body.clientName !== "string" || !body.clientName.trim() || body.clientName.length > 200 || typeof body.issue !== "string" || !body.issue.trim() || body.issue.length > 16000 || typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || (body.additionalNotes !== undefined && (typeof body.additionalNotes !== "string" || body.additionalNotes.length > 8000))) throw new AIError("input", "Provide a valid document type, client name, matter and date. Keep the matter under 16,000 characters.", false, 400);
    const language = languageInstruction(body.language);
    const prompt = `Document: ${body.documentType}\nClient: ${body.clientName}\nMatter: ${body.issue}\nDate: ${body.date}\nAdditional facts: ${body.additionalNotes || "None"}`;
    const input = { primary: "gemini" as const, system: `${SYSTEM} ${language}`, messages: [{ role: "user" as const, content: prompt }], maxTokens: 4096, signal: req.signal };
    const title = TITLES[body.documentType];
    if (body.stream) return aiStreamResponse(input, (document, source, metadata) => ({ title, document, source, metadata }));
    const generated = await generateAI(input);
    return Response.json({ title, document: generated.text, source: generated.metadata.provider, metadata: generated.metadata }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return aiErrorResponse(error); }
}

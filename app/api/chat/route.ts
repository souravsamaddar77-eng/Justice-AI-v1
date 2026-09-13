import { AIError, aiErrorResponse, generateAI, requireAIConsent } from "@/lib/ai";
import { aiStreamResponse } from "@/lib/ai-stream";
import { mockChatReply } from "@/lib/mock-data";
import type { ChatRequestBody, ChatMessage } from "@/types";
export const runtime = "nodejs";
const PERSONA = {
  citizen: "You are Justice AI, an assistant for ordinary Indian citizens. Explain legal concepts in simple language. Distinguish general information from legal advice, recommend a qualified advocate when appropriate, and never invent deadlines, citations or case facts. Keep replies under 160 words.",
  advocate: "You are Justice AI, an assistant for Indian advocates. Provide concise, precise legal research assistance. Identify uncertain citations and facts; never fabricate authorities or deadlines. Verify applicable IPC/BNS and CrPC/BNSS transition dates instead of assuming a code. Keep replies under 240 words unless asked for detail.",
};
export async function POST(req: Request) {
  let body: ChatRequestBody;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }
  try {
    if (!body || typeof body.message !== "string" || !body.message.trim() || body.message.length > 8000) throw new AIError("input", "Enter a message of up to 8,000 characters.", false, 400);
    if (body.history && (!Array.isArray(body.history) || body.history.length > 100 || body.history.some(h => !h || !["user", "assistant"].includes(h.role) || typeof h.content !== "string" || h.content.length > 16000))) throw new AIError("input", "Conversation history is invalid or too long.", false, 400);
    const persona = body.persona === "advocate" ? "advocate" : "citizen";
    if (body.mode === "demo") return Response.json({ reply: mockChatReply(body.message, persona), source: "mock" }, { headers: { "Cache-Control": "no-store" } });
    requireAIConsent(body);
    // Retain recent complete turns under a fixed text budget; never fetch case data implicitly.
    const history: ChatMessage[] = []; let length = body.message.length;
    for (const item of (body.history || []).slice(-12).reverse()) { if (length + item.content.length > 22000) break; history.unshift(item); length += item.content.length; }
    const input = { primary: "gemini" as const, system: PERSONA[persona], messages: [...history, { role: "user" as const, content: body.message.trim() }], signal: req.signal, maxTokens: 1024 };
    if (body.stream) return aiStreamResponse(input, (reply, source, metadata) => ({ reply, source, metadata }));
    const generated = await generateAI(input);
    return Response.json({ reply: generated.text, source: generated.metadata.provider, metadata: generated.metadata }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return aiErrorResponse(error); }
}

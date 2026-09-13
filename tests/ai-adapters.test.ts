import test from "node:test";
import assert from "node:assert/strict";
import { generateAI, requireAIConsent } from "../lib/ai";
import { resetProviderCooldowns } from "../lib/providers";
const request = { primary: "gemini" as const, system: "Synthetic testing", messages: [{ role: "user" as const, content: "Synthetic sample only" }] };
function configured() {
  const previous = { ...process.env }; const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "synthetic-key"; process.env.NEMOTRON_API_KEY = "synthetic-key"; process.env.AI_RETRIES = "0"; process.env.AI_FALLBACK_ENABLED = "true";
  resetProviderCooldowns();
  return () => { process.env = previous; globalThis.fetch = originalFetch; resetProviderCooldowns(); };
}
test("REST fallback calls distinct hosts and returns exact provider model", async () => {
  const restore = configured(); const hosts: string[] = [];
  try {
    process.env.GEMINI_MODEL = "preserved-primary"; process.env.NEMOTRON_FALLBACK_MODEL = "configured-secondary";
    globalThis.fetch = async (url) => { const host = new URL(String(url)).hostname; hosts.push(host); return host.includes("googleapis") ? Response.json({ error: "temporary outage" }, { status: 503 }) : Response.json({ choices: [{ message: { content: "A synthetic result." }, finish_reason: "stop" }] }); };
    const result = await generateAI(request);
    assert.deepEqual(hosts, ["generativelanguage.googleapis.com", "integrate.api.nvidia.com"]); assert.equal(result.metadata.model, "configured-secondary"); assert.equal(result.metadata.provider, "nemotron");
  } finally { restore(); }
});
test("HTTP safety errors never switch providers or disclose response details", async () => {
  const restore = configured(); let calls = 0;
  try { globalThis.fetch = async () => { calls++; return Response.json({ error: { message: "Prompt blocked by safety filter: private prompt contents" } }, { status: 400 }); };
    await assert.rejects(generateAI(request), error => error instanceof Error && /declined/.test(error.message) && !error.message.includes("private prompt")); assert.equal(calls, 1);
  } finally { restore(); }
});
test("Gemini candidate safety refuses without fallback", async () => {
  const restore = configured(); let calls = 0;
  try { globalThis.fetch = async () => { calls++; return Response.json({ candidates: [{ finishReason: "SAFETY" }] }); }; await assert.rejects(generateAI(request), /declined/); assert.equal(calls, 1); } finally { restore(); }
});
test("consent must cover every configured external processor", () => {
  const restore = configured();
  try { assert.throws(() => requireAIConsent({ consent: { providers: ["gemini"] } }), /accept/); assert.doesNotThrow(() => requireAIConsent({ consent: { providers: ["gemini", "nemotron"] } })); assert.doesNotThrow(() => requireAIConsent({ mode: "demo" })); } finally { restore(); }
});
test("live missing configuration has no mock fallback", async () => {
  const restore = configured();
  try { delete process.env.GEMINI_API_KEY; delete process.env.NEMOTRON_API_KEY; await assert.rejects(generateAI(request), /configured/); } finally { restore(); }
});
test("real SSE adapter emits tokens and requires provider completion", async () => {
  const restore = configured(); let content = "";
  try { globalThis.fetch = async () => new Response('data: {"candidates":[{"content":{"parts":[{"text":"Hello "}]}}]}\n\ndata: {"candidates":[{"content":{"parts":[{"text":"world"}]},"finishReason":"STOP"}]}\n\n', { headers: { "Content-Type": "text/event-stream" } });
    const result = await generateAI({ ...request, onDelta: text => { content += text; } }); assert.equal(content, "Hello world"); assert.equal(result.text, "Hello world"); assert.ok(result.metadata.firstResponseMs <= result.metadata.totalMs);
  } finally { restore(); }
});

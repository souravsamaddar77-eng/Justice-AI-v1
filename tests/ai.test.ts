import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AIError, runProviders, resetProviderCooldowns, type AIProvider, type AIInput } from "../lib/providers";
import { parseAnalysis } from "../lib/analysis-schema";
import { readAIResponse } from "../lib/ai-client";
const input: AIInput = { system: "Use synthetic information only.", messages: [{ role: "user", content: "Explain a sample legal notice." }] };
const policy = { attemptTimeoutMs: 100, deadlineMs: 400, retries: 0, cooldownMs: 1000 };
const provider = (id: "gemini" | "groq" | "nemotron", generate: AIProvider["generate"]): AIProvider => ({ id, model: "synthetic-test-model", capabilities: ["text", "stream"], generate });
beforeEach(resetProviderCooldowns);
test("actual secondary adapter runs after primary outage", async () => {
  const calls: string[] = [];
  const result = await runProviders(input, [provider("gemini", async () => { calls.push("primary"); throw new AIError("unavailable", "outage", true); }), provider("nemotron", async () => { calls.push("secondary"); return "Complete answer from a different provider."; })], policy);
  assert.deepEqual(calls, ["primary", "secondary"]); assert.equal(result.metadata.provider, "nemotron"); assert.equal(result.metadata.fallback, true);
});
test("both failures are explicit and do not mutate input", async () => {
  const before = JSON.stringify(input);
  await assert.rejects(runProviders(input, [provider("gemini", async () => { throw new Error("network"); }), provider("nemotron", async () => { throw new Error("network"); })], policy), /connection failed/);
  assert.equal(JSON.stringify(input), before);
});
test("provider safety refusal stops fallback", async () => {
  let secondary = false;
  await assert.rejects(runProviders(input, [provider("gemini", async () => { throw new AIError("safety", "declined", false); }), provider("nemotron", async () => { secondary = true; return "never"; })], policy), /declined/);
  assert.equal(secondary, false);
});
test("plain text refusal is not sent to a different provider", async () => {
  let secondary = false;
  await assert.rejects(runProviders(input, [provider("gemini", async () => "I cannot assist with that request."), provider("nemotron", async () => { secondary = true; return "never"; })], policy), /declined/);
  assert.equal(secondary, false);
});
test("partial stream failure never concatenates another provider", async () => {
  let secondary = false; let content = "";
  await assert.rejects(runProviders({ ...input, onDelta: text => { content += text; } }, [provider("gemini", async (_, __, delta) => { delta?.("Partial"); throw new Error("dropped"); }), provider("nemotron", async () => { secondary = true; return "Different"; })], policy), /Partial output/);
  assert.equal(content, "Partial"); assert.equal(secondary, false);
});
test("timeout is bounded even when a mock adapter ignores abort", async () => {
  const started = Date.now();
  await assert.rejects(runProviders(input, [provider("gemini", () => new Promise(() => {}))], { ...policy, attemptTimeoutMs: 15, deadlineMs: 20 }), /timed out/);
  assert.ok(Date.now() - started < 200);
});
test("cancellation aborts the current provider without fallback", async () => {
  const controller = new AbortController(); let observed = false;
  const pending = runProviders({ ...input, signal: controller.signal }, [provider("gemini", (_, signal) => new Promise(() => { signal.addEventListener("abort", () => { observed = true; }); }))], policy);
  controller.abort(); await assert.rejects(pending, /cancelled/); assert.equal(observed, true);
});
test("Retry-After creates cooldown instead of overrunning deadline", async () => {
  let primary = 0;
  const adapters = [provider("gemini", async () => { primary++; throw new AIError("unavailable", "rate limit", true, 503, 5000); }), provider("nemotron", async () => "Secondary answer")];
  await runProviders(input, adapters, { ...policy, retries: 1 }); await runProviders(input, adapters, policy); assert.equal(primary, 1);
});
test("credentials are not retried but approved secondary can serve", async () => {
  let primary = 0;
  const result = await runProviders(input, [provider("gemini", async () => { primary++; throw new AIError("credentials", "invalid key", false); }), provider("nemotron", async () => "Secondary answer")], { ...policy, retries: 1 });
  assert.equal(primary, 1); assert.equal(result.metadata.provider, "nemotron");
});
test("streaming capability is required", async () => {
  let unsupportedCalled = false;
  const unsupported = { ...provider("gemini", async () => { unsupportedCalled = true; return "never"; }), capabilities: ["text"] as AIProvider["capabilities"] };
  const result = await runProviders({ ...input, onDelta() {} }, [unsupported, provider("nemotron", async () => "Complete")], policy);
  assert.equal(unsupportedCalled, false); assert.equal(result.metadata.provider, "nemotron");
});
test("schema validation fails over before any output becomes visible", async () => {
  const result = await runProviders({ ...input, validate: raw => { if (raw !== "valid") throw new AIError("malformed", "Invalid schema", true); } }, [provider("gemini", async () => "bad"), provider("nemotron", async () => "valid")], policy);
  assert.equal(result.text, "valid");
});
test("analysis has no default statutory deadline and requires source excerpt", () => {
  const result = parseAnalysis(JSON.stringify({ urgency: "Low", summary: ["One", "Two", "Three"], keyTerms: [], deadlineDate: "2026-10-01", deadlineSource: "invented" }), "Actual notice without a deadline.");
  assert.equal(result.deadlineDate, null); assert.equal(result.daysToRespond, null); assert.equal(result.deadlineStatus, "unknown");
  assert.throws(() => parseAnalysis('{"urgency":"Low"}', "source"), /structure/);
  const payload = { urgency: "Low", summary: ["One", "Two", "Three"], keyTerms: [], deadlineDate: "2026-10-01", deadlineSource: "Please reply." };
  assert.equal(parseAnalysis(JSON.stringify(payload), "Please reply.").deadlineDate, null);
  payload.deadlineSource = "Please reply by 1 October 2026.";
  assert.equal(parseAnalysis(JSON.stringify(payload), payload.deadlineSource).deadlineDate, "2026-10-01");
});
test("client stream needs final result and preserves received partial output", async () => {
  let content = "";
  const response = new Response('event: delta\ndata: {"text":"Partial"}\n\n', { headers: { "Content-Type": "text/event-stream" } });
  await assert.rejects(readAIResponse(response, text => { content += text; }, () => {}), /stopped before completion/); assert.equal(content, "Partial");
});
test("client stream handles split chunks and complete result", async () => {
  const encode = new TextEncoder(); const stream = new ReadableStream({ start(c) { c.enqueue(encode.encode('event: del')); c.enqueue(encode.encode('ta\ndata: {"text":"Hello"}\n\nevent: result\ndata: {"reply":"Hello","source":"gemini"}\n\n')); c.close(); } });
  const result = await readAIResponse<{reply:string}>(new Response(stream, { headers: { "Content-Type": "text/event-stream" } }), () => {}, () => {}); assert.equal(result.reply, "Hello");
});
test("partial failure resets the answer before Groq replacement", async () => {
  const events: string[] = []; let displayed = "";
  const result = await runProviders({ ...input, onDelta: text => { displayed += text; events.push(text); }, onReset: () => { displayed = ""; events.push("reset"); } }, [
    provider("gemini", async (_, __, delta) => { delta?.("Failed partial"); throw new Error("disconnected"); }),
    provider("groq", async (_, __, delta) => { delta?.("Complete replacement"); return "Complete replacement"; }),
  ], policy);
  assert.deepEqual(events, ["Failed partial", "reset", "Complete replacement"]);
  assert.equal(displayed, result.text); assert.equal(result.metadata.provider, "groq");
});
test("timeout falls through to Groq while late aborted tokens are ignored", async () => {
  let displayed = "";
  const result = await runProviders({ ...input, onDelta: text => { displayed += text; }, onReset: () => { displayed = ""; } }, [
    provider("gemini", async (_, __, delta) => { await new Promise(resolve => setTimeout(resolve, 30)); delta?.("Late failed answer"); return "Late failed answer"; }),
    provider("groq", async (_, __, delta) => { delta?.("Replacement"); return "Replacement"; }),
  ], { ...policy, attemptTimeoutMs: 10 });
  await new Promise(resolve => setTimeout(resolve, 35));
  assert.equal(displayed, "Replacement"); assert.equal(result.metadata.provider, "groq");
});
test("client reset clears a failed partial before replacement and cannot be ignored", async () => {
  const events = 'event: delta\ndata: {"text":"Partial"}\n\nevent: reset\ndata: {}\n\nevent: delta\ndata: {"text":"Complete"}\n\nevent: result\ndata: {"reply":"Complete"}\n\n';
  let displayed = "";
  const response = () => new Response(events, { headers: { "Content-Type": "text/event-stream" } });
  const result = await readAIResponse<{reply:string}>(response(), text => { displayed += text; }, () => {}, () => { displayed = ""; });
  assert.equal(displayed, result.reply);
  await assert.rejects(readAIResponse(response(), () => {}, () => {}), /restarted/);
});
test("partial safety refusal and cancellation never switch providers", async () => {
  for (const code of ["safety", "cancelled"]) {
    let called = false;
    await assert.rejects(runProviders({ ...input, onDelta() {}, onReset() {} }, [
      provider("gemini", async (_, __, delta) => { delta?.("Partial"); throw new AIError(code, code, false); }),
      provider("groq", async () => { called = true; return "Never"; }),
    ], policy), new RegExp(code));
    assert.equal(called, false);
  }
});

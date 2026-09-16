import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { POST as review } from "../app/api/review-draft/route";
import { POST as chat } from "../app/api/chat/route";
import { POST as analyze } from "../app/api/analyze-document/route";
import { parseDraftReview } from "../lib/draft-review";
import { LEGAL_SCOPE_REFUSAL } from "../lib/legal-scope";
import { resetProviderCooldowns } from "../lib/providers";
import { readAIResponse } from "../lib/ai-client";

const initial = { ...process.env };
const originalFetch = globalThis.fetch;
beforeEach(() => {
  process.env.GEMINI_API_KEY = "synthetic-primary"; process.env.GROQ_API_KEY = "synthetic-fallback";
  process.env.AI_RETRIES = "0"; process.env.AI_FALLBACK_ENABLED = "true"; resetProviderCooldowns();
});
afterEach(() => { process.env = { ...initial }; globalThis.fetch = originalFetch; resetProviderCooldowns(); });
const request = (body: unknown, signal?: AbortSignal) => new Request("http://localhost/api/review-draft", { method: "POST", body: JSON.stringify(body), signal });
const primary = (text: string) => Response.json({ candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }] });
const secondary = (text: string) => Response.json({ choices: [{ message: { content: text }, finish_reason: "stop" }] });
const clause = "The supplier accepts unlimited liability for every loss.";
const source = `SERVICE AGREEMENT\n\n${clause}\n\nPayment is due within 30 days.`;
function output(quote = clause) {
  return { summary: "The supplied agreement leaves liability uncapped.", findings: [{ kind: "risky-term", severity: "high", title: "Unlimited liability", explanation: "The supplier's exposure has no stated cap.", originalText: quote, replacementText: "Liability is subject to a cap of [agreed amount] and [agreed exclusions].", legalReference: null }] };
}

test("review grounds source locations on exact submitted text and permits real zero-finding results", () => {
  const parsed = parseDraftReview(JSON.stringify(output()), source);
  assert.equal(parsed.findings[0].location?.start, source.indexOf(clause));
  assert.equal(parsed.findings[0].location?.paragraph, 2);
  assert.equal(source.slice(parsed.findings[0].location!.start, parsed.findings[0].location!.end), clause);
  const omittedReference = { ...output().findings[0], legalReference: undefined };
  assert.equal(parseDraftReview(JSON.stringify({ summary: "A review.", findings: [omittedReference] }), source).findings[0].legalReference, null);
  assert.deepEqual(parseDraftReview('{"summary":"No material issues identified.","findings":[]}', source).findings, []);
});

test("unmatched or ambiguous source quotes, invalid schemas and invented missing-clause locations are rejected", () => {
  assert.throws(() => parseDraftReview(JSON.stringify(output("Invented termination clause")), source));
  assert.throws(() => parseDraftReview(JSON.stringify(output()), `${source}\n${clause}`));
  assert.throws(() => parseDraftReview('{"summary":"x","findings":[null]}', source));
  assert.throws(() => parseDraftReview(JSON.stringify({ ...output(), findings: Array(13).fill(output().findings[0]) }), source));
  const missing = { ...output().findings[0], kind: "missing-clause", originalText: "" };
  const parsed = parseDraftReview(JSON.stringify({ summary: "Consider adding a dispute clause.", findings: [missing] }), source);
  assert.equal(parsed.findings[0].location, null);
  assert.throws(() => parseDraftReview(JSON.stringify({ summary: "x", findings: [{ ...missing, originalText: "Invented clause" }] }), source));
  const incomplete = parseDraftReview(JSON.stringify({ summary: "x", findings: [{ ...missing, originalText: clause }] }), source).findings[0];
  assert.equal(incomplete.kind, "ambiguity");
  assert.equal(incomplete.location?.start, source.indexOf(clause));
});

test("PDF whitespace changes resolve to exact source while changed words and ambiguous passages are rejected", () => {
  const wrapped = "The supplier accepts unlimited\nliability for every loss.";
  const doc = `AGREEMENT\n\n${wrapped}`;
  const finding = parseDraftReview(JSON.stringify(output()), doc).findings[0];
  assert.equal(finding.originalText, wrapped);
  assert.equal(doc.slice(finding.location!.start, finding.location!.end), wrapped);
  assert.throws(() => parseDraftReview(JSON.stringify(output()), `${doc}\n${wrapped}`));
  assert.throws(() => parseDraftReview(JSON.stringify(output(clause.replace("unlimited", "limited"))), doc));
  const punctuation = "Payment (including tax) is INR 4,200.00 [monthly].";
  assert.equal(parseDraftReview(JSON.stringify(output(punctuation)), punctuation.replace(" is ", "\nis ")).findings[0].originalText, punctuation.replace(" is ", "\nis "));
});

test("review sends actual draft text to Gemini and Groq, including response language and shared restrictions", async () => {
  const hosts: string[] = [];
  globalThis.fetch = async (url, init) => {
    hosts.push(new URL(String(url)).hostname);
    const body = JSON.parse(String(init?.body));
    const isPrimary = String(url).includes("googleapis");
    const system = isPrimary ? body.systemInstruction.parts[0].text : body.messages[0].content;
    const supplied = isPrimary ? body.contents[0].parts[0].text : body.messages[1].content;
    assert.equal(supplied, source); assert.match(system, /Hindi/); assert.ok(system.includes(LEGAL_SCOPE_REFUSAL));
    assert.match(system, /character-for-character/); assert.match(system, /missing-clause/);
    return isPrimary ? new Response(null, { status: 503 }) : secondary(JSON.stringify(output()));
  };
  const response = await review(request({ text: source, language: "hi" }));
  const body = await response.json();
  assert.equal(response.status, 200); assert.equal(body.source, "groq"); assert.equal(body.documentText, source);
  assert.equal(body.findings[0].originalText, clause); assert.equal(body.extractionMethod, "pasted");
  assert.deepEqual(hosts, ["generativelanguage.googleapis.com", "api.groq.com"]);
});

test("a hallucinated Gemini quote causes validated Groq replacement, never fake highlights", async () => {
  globalThis.fetch = async url => String(url).includes("googleapis") ? primary(JSON.stringify(output("This is not in the document."))) : secondary(JSON.stringify(output()));
  const response = await review(request({ text: source })); const body = await response.json();
  assert.equal(response.status, 200); assert.equal(body.source, "groq"); assert.equal(body.findings[0].originalText, clause);
});

test("TXT uploads extract each file's real bytes rather than returning a canned document", async () => {
  const received: string[] = [];
  globalThis.fetch = async (_url, init) => {
    received.push(JSON.parse(String(init?.body)).contents[0].parts[0].text);
    return primary('{"summary":"No material issues identified in this excerpt.","findings":[]}');
  };
  for (const text of [source, "LEASE AGREEMENT\nRent shall be INR 4200 per month."]) {
    const response = await review(request({ filename: "draft.txt", fileBase64: Buffer.from(text).toString("base64") }));
    const body = await response.json(); assert.equal(response.status, 200);
    assert.ok(body.documentText.includes(text)); assert.equal(body.pageCount, 1); assert.equal(body.extractionMethod, "native");
    assert.deepEqual(body.findings, []);
  }
  assert.notEqual(received[0], received[1]);
});

test("review rejects invalid requests before providers and preserves honest errors when all providers fail", async () => {
  let calls = 0; globalThis.fetch = async () => { calls++; return new Response(null, { status: 503 }); };
  for (const body of [{}, null, { text: 5 }, { text: "x", fileBase64: "xxxx" }, { text: "x", language: "invented" }, { text: "x".repeat(50001) }, { filename: "a.pdf", fileBase64: "invalid!" }]) {
    const response = await review(request(body)); assert.ok(response.status >= 400 && response.status < 500);
  }
  assert.equal(calls, 0);
  const failed = await review(request({ text: source })); assert.equal(failed.status, 503);
  const body = await failed.json(); assert.ok(body.error); assert.equal(body.findings, undefined); assert.equal(calls, 2);
});

test("cancelled review does not call providers", async () => {
  let called = false; globalThis.fetch = async () => { called = true; return primary(JSON.stringify(output())); };
  const controller = new AbortController(); controller.abort();
  const response = await review(request({ text: source }, controller.signal));
  assert.equal(response.status, 499); assert.equal(called, false);
});

test("standard chat domain refusal completes normally and never triggers fallback, including streaming", async () => {
  for (const stream of [false, true]) {
    let calls = 0;
    globalThis.fetch = async (_url, init) => {
      calls++; const body = JSON.parse(String(init?.body));
      assert.ok(body.systemInstruction.parts[0].text.includes(LEGAL_SCOPE_REFUSAL));
      return stream ? new Response(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: LEGAL_SCOPE_REFUSAL }] }, finishReason: "STOP" }] })}\n\n`, { headers: { "Content-Type": "text/event-stream" } }) : primary(LEGAL_SCOPE_REFUSAL);
    };
    const response = await chat(request({ message: "Write Python code to sort numbers.", stream }));
    const data = await readAIResponse<{ reply: string }>(response, () => {}, () => {}, () => {});
    assert.equal(data.reply, LEGAL_SCOPE_REFUSAL); assert.equal(calls, 1);
  }
});

test("Groq gets the same legal-only policy after a Gemini failure and returns the standard refusal", async () => {
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++; const body = JSON.parse(String(init?.body));
    if (String(url).includes("googleapis")) return new Response(null, { status: 503 });
    assert.ok(body.messages[0].content.includes(LEGAL_SCOPE_REFUSAL));
    assert.match(body.messages[0].content, /recipes/); assert.match(body.messages[0].content, /untrusted/);
    return secondary(LEGAL_SCOPE_REFUSAL);
  };
  const response = await chat(request({ message: "Give me a pasta recipe." }));
  assert.equal((await response.json()).reply, LEGAL_SCOPE_REFUSAL); assert.equal(calls, 2);
});

test("structured non-legal document refusals are terminal on review and notice analysis routes", async () => {
  for (const handler of [review, analyze]) {
    let calls = 0; globalThis.fetch = async () => { calls++; return primary('{"outOfScope":true}'); };
    const response = await handler(request({ text: "Recipe: boil pasta and add sauce." }));
    assert.equal(response.status, 422); const body = await response.json();
    assert.equal(body.code, "domain"); assert.equal(body.error, LEGAL_SCOPE_REFUSAL); assert.equal(calls, 1);
  }
});

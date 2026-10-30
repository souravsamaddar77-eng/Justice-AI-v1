import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { POST } from "../app/api/speech/route";

const originalFetch = globalThis.fetch;
const originalKey = process.env.GEMINI_API_KEY;
afterEach(() => { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey; });
const request = (body: unknown, signal?: AbortSignal) => new Request("http://localhost/api/speech", { method: "POST", body: JSON.stringify(body), signal });
const wav = () => { const buffer = Buffer.alloc(46); buffer.write("RIFF"); buffer.write("WAVE", 8); return buffer; };
const upstream = (overrides: object = {}) => ({ status: "completed", steps: [{ type: "model_output", content: [{ type: "audio", mime_type: "audio/wav", data: wav().toString("base64") }] }], ...overrides });

test("speech route rejects invalid text and languages before contacting Google", async () => {
  let calls = 0; globalThis.fetch = async () => { calls++; return Response.json({}); };
  for (const body of [null, {}, { text: "x" }, { text: "", language: "bn" }, { text: "x", language: "unknown" }, { text: "x".repeat(601), language: "bn" }]) {
    assert.equal((await POST(request(body))).status, 400);
  }
  assert.equal((await POST(new Request("http://localhost/api/speech", { method: "POST", body: "{" }))).status, 400);
  assert.equal((await POST(request({ text: "x".repeat(5001), language: "bn" }))).status, 413);
  assert.equal(calls, 0);
});

test("missing speech configuration returns a clear error without a provider call", async () => {
  delete process.env.GEMINI_API_KEY;
  globalThis.fetch = async () => { throw new Error("Must not call Google"); };
  assert.equal((await POST(request({ text: "বাংলা", language: "bn" }))).status, 503);
});

test("speech route sends exact Bengali text with the server key and returns private WAV audio", async () => {
  process.env.GEMINI_API_KEY = "synthetic-server-secret";
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://generativelanguage.googleapis.com/v1beta/interactions");
    assert.equal(new Headers(init!.headers).get("x-goog-api-key"), "synthetic-server-secret");
    assert.equal(init!.cache, "no-store");
    const payload = JSON.parse(init!.body as string);
    assert.equal(payload.input[0].content[0].text, "নমস্কার। বাংলায় উত্তর শুনুন।");
    assert.match(payload.input[0].content[0].annotations[0].style, /bn/);
    assert.equal(payload.model, "gemini-3.8-flash-lite-tts");
    assert.equal(payload.store, false);
    return Response.json(upstream());
  };
  const response = await POST(request({ text: "নমস্কার। বাংলায় উত্তর শুনুন।", language: "bn" }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "audio/wav");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), wav());
});

test("provider errors never echo the secret or the reply text", async () => {
  process.env.GEMINI_API_KEY = "synthetic-server-secret";
  globalThis.fetch = async () => Response.json({ error: "synthetic-server-secret sensitive reply" }, { status: 429 });
  const response = await POST(request({ text: "sensitive reply", language: "bn" }));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /synthetic-server-secret|sensitive reply/);
});

test("malformed, partial, non-WAV and oversized provider audio is never served", async () => {
  process.env.GEMINI_API_KEY = "synthetic-key";
  for (const payload of [{}, upstream({ status: "in_progress" }), upstream({ steps: [] }), upstream({ steps: [{ type: "model_output", content: [{ type: "audio", mime_type: "audio/wav", data: "not audio" }] }] }), upstream({ steps: [{ type: "model_output", content: [{ type: "audio", mime_type: "audio/wav", data: "x".repeat(5_333_337) }] }] })]) {
    globalThis.fetch = async () => Response.json(payload);
    assert.equal((await POST(request({ text: "বাংলা", language: "bn" }))).status, 503);
  }
});

test("cancelling the client request aborts speech generation", async () => {
  process.env.GEMINI_API_KEY = "synthetic-key";
  const controller = new AbortController();
  globalThis.fetch = async (_url, init) => {
    controller.abort();
    assert.equal(init!.signal!.aborted, true);
    throw init!.signal!.reason;
  };
  assert.equal((await POST(request({ text: "বাংলা", language: "bn" }, controller.signal))).status, 499);
});

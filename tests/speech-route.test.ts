import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { POST } from "../app/api/speech/route";

const originalFetch = globalThis.fetch;
const originalKey = process.env.GEMINI_API_KEY;
afterEach(() => { globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey; });
const request = (body: unknown, signal?: AbortSignal) => new Request("http://localhost/api/speech", { method: "POST", body: JSON.stringify(body), signal });
const wav = () => { const buffer = Buffer.alloc(46); buffer.write("RIFF"); buffer.write("WAVE", 8); return buffer; };
const upstream = (overrides: object = {}) => ({ status: "completed", steps: [{ type: "model_output", content: [{ type: "audio", mime_type: "audio/wav", data: wav().toString("base64") }] }], ...overrides });
const pcmUpstream = (pcm = Buffer.from([1, 0, 2, 0])) => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ inlineData: { mimeType: "audio/L16;codec=pcm;rate=24000", data: pcm.toString("base64") } }] } }] });

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
  assert.equal(response.status, 429);
  assert.doesNotMatch(await response.text(), /synthetic-server-secret|sensitive reply/);
});

test("speech generation switches models when the primary reaches its daily limit", async () => {
  process.env.GEMINI_API_KEY = "synthetic-key";
  const models: string[] = [];
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init!.body as string);
    models.push(body.model ?? String(url).split("/").at(-1)!.split(":")[0]);
    if (models.length === 1) return Response.json({ error: "daily limit" }, { status: 429 });
    assert.match(body.contents[0].parts[0].text, /বাংলায় উত্তর।/);
    assert.deepEqual(body.generationConfig.responseModalities, ["AUDIO"]);
    return Response.json(pcmUpstream());
  };
  const response = await POST(request({ text: "বাংলায় উত্তর।", language: "bn" }));
  assert.equal(response.status, 200);
  assert.deepEqual(models, ["gemini-3.8-flash-lite-tts", "gemini-2.5-flash-preview-tts"]);
  const audio = Buffer.from(await response.arrayBuffer());
  assert.equal(audio.toString("ascii", 0, 4), "RIFF");
  assert.equal(audio.readUInt32LE(24), 24000);
  assert.equal(audio.readUInt16LE(22), 1);
  assert.equal(audio.readUInt16LE(34), 16);
  assert.equal(audio.readUInt32LE(40), 4);
  assert.deepEqual(audio.subarray(44), Buffer.from([1, 0, 2, 0]));
});

test("fallback refuses incomplete audio, unsafe content and invalid PCM rather than playing noise", async () => {
  process.env.GEMINI_API_KEY = "synthetic-key";
  const incomplete = pcmUpstream(); incomplete.candidates[0].finishReason = "MAX_TOKENS";
  const wrongFormat = pcmUpstream(); wrongFormat.candidates[0].content.parts[0].inlineData.mimeType = "audio/L16;codec=pcm;rate=48000";
  for (const payload of [incomplete, wrongFormat, pcmUpstream(Buffer.from([1])), { ...pcmUpstream(), promptFeedback: { blockReason: "SAFETY" } }]) {
    let calls = 0;
    globalThis.fetch = async () => ++calls === 1 ? Response.json({}, { status: 429 }) : Response.json(payload);
    assert.equal((await POST(request({ text: "বাংলা", language: "bn" }))).status, 503);
  }
});

test("both speech model limits produce a bounded retry header without leaking upstream details", async () => {
  process.env.GEMINI_API_KEY = "synthetic-key";
  globalThis.fetch = async () => Response.json({ error: "sensitive upstream details" }, { status: 429, headers: { "Retry-After": "40000" } });
  const response = await POST(request({ text: "বাংলা", language: "bn" }));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "40000");
  assert.equal((await response.json()).code, "rate_limited");
});

test("credential or content rejections do not switch speech models", async () => {
  process.env.GEMINI_API_KEY = "synthetic-key";
  for (const status of [401, 403, 422]) {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({ error: "rejected" }, { status }); };
    assert.equal((await POST(request({ text: "বাংলা", language: "bn" }))).status, 503);
    assert.equal(calls, 1);
  }
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

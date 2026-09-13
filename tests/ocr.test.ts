import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extractDocument, getExtractionConfig, ExtractionError } from "../lib/extraction";
import { ocrFile, extractTextWithOcr, getOCRSettings } from "../lib/ocr";
import { redactIdentifiers } from "../lib/redaction";
const fixture = (name: string) => readFile(new URL(`./fixtures/ocr/${name}`, import.meta.url));
const mockOCR: typeof ocrFile = async bytes => { assert.ok(bytes.length > 100); return { text: "SYNTHETIC OCR TEST REFERENCE ALPHA 12345", pages: ["SYNTHETIC OCR TEST REFERENCE ALPHA 12345"] }; };
test("digital PDF embedded text is read without OCR or its key", async () => {
  let external = false;
  const result = await extractDocument({ bytes: await fixture("digital.pdf"), filename: "digital.pdf" }, { ocr: async () => { external = true; throw new Error("should never run"); } });
  assert.match(result.text, /REFERENCE DIGITAL 12345/); assert.equal(result.method, "native"); assert.equal(external, false); assert.equal(result.sha256.length, 64);
});
test("UTF-8 plain text is read directly", async () => {
  const result = await extractDocument({ bytes: await fixture("plain.txt"), filename: "plain.txt" }); assert.match(result.text, /SYNTHETIC PLAIN TEXT/); assert.equal(result.method, "native");
});
test("scanned PDF renders a real image before OCR", async () => {
  const result = await extractDocument({ bytes: await fixture("scanned.pdf"), filename: "scanned.pdf", allowOCR: true }, { ocr: mockOCR }); assert.equal(result.method, "ocr"); assert.match(result.text, /ALPHA 12345/);
});
test("mixed PDF preserves page order and does not OCR digital pages", async () => {
  let calls = 0;
  const result = await extractDocument({ bytes: await fixture("mixed.pdf"), filename: "mixed.pdf", allowOCR: true }, { ocr: async (...args) => { calls++; return mockOCR(...args); } });
  assert.equal(calls, 1); assert.equal(result.method, "mixed"); assert.deepEqual(result.pages.map(p => p.method), ["native", "ocr", "native"]); assert.deepEqual(result.pages.map(p => p.page), [1, 2, 3]); assert.ok(result.text.indexOf("ORDER FIRST") < result.text.indexOf("ALPHA")); assert.ok(result.text.indexOf("ALPHA") < result.text.indexOf("ORDER LAST")); assert.equal(result.text.match(/ALPHA/g)?.length, 1);
});
test("PNG and JPEG are validated then sent to OCR", async () => {
  for (const filename of ["text.png", "text.jpg"]) { const result = await extractDocument({ bytes: await fixture(filename), filename, allowOCR: true }, { ocr: mockOCR }); assert.equal(result.method, "ocr"); }
});
test("scan cannot leave the server without explicit OCR permission", async () => {
  await assert.rejects(extractDocument({ bytes: await fixture("scanned.pdf"), filename: "scanned.pdf" }, { ocr: mockOCR }), /Accept OCR.space/);
});
test("encrypted, corrupt and unsupported files produce honest errors", async () => {
  await assert.rejects(extractDocument({ bytes: await fixture("encrypted.pdf"), filename: "encrypted.pdf", allowOCR: true }), /password protected/);
  await assert.rejects(extractDocument({ bytes: await fixture("corrupt.pdf"), filename: "corrupt.pdf", allowOCR: true }), /could not be read/);
  await assert.rejects(extractDocument({ bytes: await fixture("text.png"), filename: "renamed.pdf", allowOCR: true }), /contents must match/);
});
test("pattern redaction really removes common identifiers", () => {
  const text = redactIdentifiers("Aadhaar 1234 5678 9012, PAN ABCDE1234F, phone +91 9876543210."); assert.ok(!text.includes("9012")); assert.ok(!text.includes("ABCDE1234F")); assert.ok(!text.includes("9876543210")); assert.match(text, /REDACTED/);
});
test("extraction configuration fingerprints language changes", () => {
  const previous = process.env.OCR_SPACE_LANGUAGE;
  try { process.env.OCR_SPACE_LANGUAGE = "eng"; const first = getExtractionConfig(); process.env.OCR_SPACE_LANGUAGE = "auto"; assert.notEqual(getExtractionConfig(), first); } finally { if (previous === undefined) delete process.env.OCR_SPACE_LANGUAGE; else process.env.OCR_SPACE_LANGUAGE = previous; }
});
function setupFetch() { const previous = { ...process.env }; const fetch = globalThis.fetch; process.env.OCR_SPACE_API_KEY = "synthetic-key"; process.env.OCR_TIMEOUT_MS = "1000"; return () => { process.env = previous; globalThis.fetch = fetch; }; }
test("OCR sends correct multipart MIME bytes and header credentials", async () => {
  const restore = setupFetch();
  try {
    globalThis.fetch = async (_, init) => { assert.equal((init?.headers as {apikey:string}).apikey, "synthetic-key"); assert.ok(init?.body instanceof FormData); const file = init.body.get("file") as File; assert.equal(file.type, "image/png"); assert.equal(file.name, "scan.png"); assert.equal(init.body.has("base64Image"), false); assert.equal(init.body.has("apikey"), false); return Response.json({ OCRExitCode: 1, IsErroredOnProcessing: false, ParsedResults: [{ FileParseExitCode: 1, ParsedText: "EXTRACTED" }] }); };
    const result = await extractTextWithOcr(`data:image/png;base64,${(await fixture("text.png")).toString("base64")}`, "PNG"); assert.equal(result.text, "EXTRACTED");
  } finally { restore(); }
});
test("missing key never produces a plausible extraction", async () => {
  const restore = setupFetch();
  try { delete process.env.OCR_SPACE_API_KEY; await assert.rejects(ocrFile(await fixture("text.png"), "image/png", "text.png"), /not configured/); } finally { restore(); }
});
test("invalid key, rate limit and provider-level partial errors are sanitized", async () => {
  const restore = setupFetch();
  try {
    const responses = [Response.json({ ErrorMessage: "API key invalid SECRET", OCRExitCode: 4, IsErroredOnProcessing: true }), new Response("", { status: 429 }), Response.json({ OCRExitCode: 2, IsErroredOnProcessing: false, ParsedResults: [{ FileParseExitCode: 1, ParsedText: "one page" }, { FileParseExitCode: -10, ErrorMessage: "PRIVATE TEXT" }] })];
    const expected = ["credentials", "rate_limit", "ocr_failed"];
    for (let index = 0; index < responses.length; index++) { globalThis.fetch = async () => responses[index]; await assert.rejects(ocrFile(await fixture("text.png"), "image/png", "text.png"), error => error instanceof ExtractionError && error.code === expected[index] && !/SECRET|PRIVATE/.test(error.message)); }
  } finally { restore(); }
});
test("OCR timeout aborts the transport", async () => {
  const restore = setupFetch(); let aborted = false;
  try { globalThis.fetch = async (_, init) => new Promise((_, reject) => { init?.signal?.addEventListener("abort", () => { aborted = true; reject(new Error("aborted")); }); }); await assert.rejects(ocrFile(await fixture("text.png"), "image/png", "text.png"), /timed out/); assert.equal(aborted, true); } finally { restore(); }
});
test("unsupported language and foreign endpoint cannot send scans", () => {
  const restore = setupFetch();
  try { process.env.OCR_SPACE_LANGUAGE = "hin"; assert.throws(getOCRSettings, /supported setting/); process.env.OCR_SPACE_LANGUAGE = "eng"; process.env.OCR_SPACE_ENDPOINT = "https://unrelated.example/parse/image"; assert.throws(getOCRSettings, /OCR.space/); } finally { restore(); }
});

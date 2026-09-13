/** Live provider verification using only repository synthetic fixtures. Never prints keys or text. */
import { loadEnvConfig } from "@next/env";
import { readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { extractDocument, ExtractionError } from "../lib/extraction";
loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
async function main() {
  const results = [];
  for (const filename of ["digital.pdf", "scanned.pdf", "text.png", "text.jpg", "mixed.pdf"]) {
    const start = performance.now();
    try {
      const bytes = await readFile(new URL(`../tests/fixtures/ocr/${filename}`, import.meta.url));
      const result = await extractDocument({ bytes, filename, allowOCR: true });
      const expectedTextFound = filename === "digital.pdf" ? result.text.includes("REFERENCE DIGITAL 12345") : /ALPHA\s+12345/i.test(result.text);
      results.push({ filename, success: true, expectedTextFound, method: result.method, pages: result.pages.length, pageOrder: result.pages.map(p => p.page), methods: result.pages.map(p => p.method), totalMs: Math.round(performance.now() - start) });
    } catch (error) { results.push({ filename, success: false, code: error instanceof ExtractionError ? error.code : "unexpected", message: error instanceof ExtractionError ? error.message : "Unexpected extraction failure", totalMs: Math.round(performance.now() - start) }); }
    console.log(JSON.stringify(results.at(-1)));
  }
  await writeFile('docs/ocr-live-results.json', JSON.stringify({ measuredAt: new Date().toISOString(), syntheticFixturesOnly: true, results }, null, 2));
}
main().catch(() => { console.error("Live verification could not finish; no private data was printed."); process.exitCode = 1; });

import { readFile, writeFile } from 'node:fs/promises';
const origin = process.env.TEST_ORIGIN || 'http://localhost:3000';
const reports = [];
for (const filename of ['digital.pdf', 'scanned.pdf', 'corrupt.pdf']) {
  const start = performance.now();
  const bytes = await readFile(new URL(`../tests/fixtures/ocr/${filename}`, import.meta.url));
  const response = await fetch(`${origin}/api/analyze-document`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({text:'', filename, fileBase64:bytes.toString('base64'), language:'en'}), signal:AbortSignal.timeout(60000) });
  let data; try { data = await response.json(); } catch { data = { code:'non_json_response' }; }
  reports.push({ filename, status:response.status, source:data.source, extractionMethod:data.extractionMethod, deadlineDate:data.deadlineDate, deadlineStatus:data.deadlineStatus, summaryValidated:Array.isArray(data.summary)&&data.summary.length===3, extractionRetained:Boolean(data.extraction?.text), code:data.code, totalMs:Math.round(performance.now()-start) });
  console.log(JSON.stringify(reports.at(-1)));
}
await writeFile('docs/analysis-route-results.json', JSON.stringify(reports,null,2));

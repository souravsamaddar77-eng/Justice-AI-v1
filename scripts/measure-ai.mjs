// Sends only fixed synthetic prompts. Does not print prompts, generated text or keys.
import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
const origin = process.env.TEST_ORIGIN || 'http://localhost:3000';
const config = await (await fetch(`${origin}/api/ai/config`)).json();
const consent = { providers: config.providers.map(p => p.id) };
const cases = [
  { name: 'chat-json', path: '/api/chat', body: { message: 'Explain what a document title is in one sentence.', history: [], persona: 'citizen' } },
  { name: 'chat-stream', path: '/api/chat', body: { message: 'Explain what a document title is in one sentence.', history: [], persona: 'citizen', stream: true } },
  { name: 'draft-stream', path: '/api/draft-document', body: { clientName: 'Synthetic Test Person', issue: 'A fictional exercise: state that the supplied document has a title. No real person, dispute, proceeding or legal claim is involved. Keep it under 100 words.', date: '2026-09-13', documentType: 'affidavit', additionalNotes: 'Use placeholders for all missing facts.', stream: true } },
];
const results = [];
for (const item of cases) {
  // Warm route compilation using invalid input without contacting a provider.
  await fetch(`${origin}${item.path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const started = performance.now();
  const response = await fetch(`${origin}${item.path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item.body, mode: 'live', consent }), signal: AbortSignal.timeout(100000) });
  const headersMs = Math.round(performance.now() - started);
  let firstContentMs = null, data = null, error = null, buffer = '';
  if (response.headers.get('content-type')?.includes('text/event-stream')) {
    for await (const chunk of response.body) {
      buffer += new TextDecoder().decode(chunk);
      const events = buffer.split('\n\n'); buffer = events.pop() || '';
      for (const event of events) {
        const type = event.split('\n').find(l => l.startsWith('event:'))?.slice(6).trim();
        const payload = JSON.parse(event.split('\n').find(l => l.startsWith('data:'))?.slice(5) || '{}');
        if (type === 'delta' && firstContentMs === null) firstContentMs = Math.round(performance.now() - started);
        if (type === 'result') data = payload;
        if (type === 'error') error = { code: payload.code, retryable: payload.retryable };
      }
    }
  } else { data = await response.json(); firstContentMs = Math.round(performance.now() - started); if (!response.ok) error = { code: data.code, retryable: data.retryable }; }
  results.push({ name: item.name, measuredAt: new Date().toISOString(), httpStatus: response.status, headersMs, firstContentMs, totalMs: Math.round(performance.now() - started), source: data?.source, metadata: data?.metadata, error });
  console.log(JSON.stringify(results.at(-1)));
}
await writeFile('docs/ai-latency-final.json', JSON.stringify({ note: 'Single local development measurement per request; not a controlled speed comparison. Early SSE headers are progress, not generated content.', results }, null, 2));

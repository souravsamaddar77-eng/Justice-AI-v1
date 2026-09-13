const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const original = Module._load;
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
Module._load = function(request, parent, main) { if (request === 'server-only') return {}; if (request.startsWith('@/')) request = path.join(__dirname, '..', request.slice(2)); return original.call(this, request, parent, main); };
const { bundlePdf } = require('../lib/cases/pdf.ts');
async function main() {
  const id = '44444444-4444-4444-8444-444444444444';
  const record = { id, title: 'Synthetic reviewed case bundle', description: 'A fixture for layout verification.\nहिंदी: न्याय और अधिकार। कृपया अपना जवाब प्रस्तुत करें।\nमराठी: कृपया कागदपत्रे सादर करा.\nবাংলা: ন্যায়বিচার এবং অধিকার। অনুগ্রহ করে আপনার উত্তর জমা দিন।', category: 'Civil', status: 'open' };
  const base = { id, case_id: id, resource_id: id, version: 2, review_status: 'reviewed', reviewer_id: id, reviewed_at: '2026-09-13T00:00:00Z', created_at: '2026-09-13T00:00:00Z', created_by: id, updated_by: id, deleted_at: null };
  const items = [
    { ...base, kind: 'timeline', title: 'Hearing date / सुनवाई की तारीख', content: 'The synthetic document mentions a hearing date. Confirmed for fixture testing.', metadata: { date: '2026-10-12', date_type: 'explicit', confirmation: 'confirmed', source_item_id: id, source_excerpt: 'Hearing date: 2026-10-12.' } },
    { ...base, kind: 'document', title: 'Synthetic original', content: '', metadata: { filename: 'नोटिस.txt', size: 140, sha256: 'a'.repeat(64) } },
    { ...base, kind: 'draft', title: 'Reviewed response / समीक्षा किया गया उत्तर', content: Array.from({ length: 35 }, (_, i) => `${i + 1}. This is synthetic paragraph text to verify line wrapping and pagination. The original has been retained, and this version was reviewed.\nहिंदी: न्याय और अधिकार। বাংলা: ন্যায়বিচার এবং অধিকার।`).join('\n\n'), metadata: { review_comment: 'Fixture review only.' } },
    { ...base, kind: 'task', title: 'Prepare response', content: 'Check the original before using any extracted text.', metadata: { completed: false, due_date: null, confirmation: 'pending_review' } },
  ];
  const output = path.join(__dirname, '..', 'tmp', 'pdfs'); fs.mkdirSync(output, { recursive: true });
  const bytes = await bundlePdf({ record }, items);
  const filename = path.join(output, 'reviewed-case-bundle-fixture.pdf'); fs.writeFileSync(filename, bytes);
  console.log(filename);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

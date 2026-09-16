// Deterministic contract tests. The Supabase transport is replaced only in this
// test process; production persistence always uses the managed database/storage.
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalLoad = Module._load;
const originalFetch = global.fetch;
const originalTs = require.extensions['.ts'];
let jar = new Map();
let clerkActor = null;
const clerkId = id => `user_${id.replaceAll('-', '')}`;
const emails = { '11111111-1111-4111-8111-111111111111': 'owner@example.test', '22222222-2222-4222-8222-222222222222': 'advocate@example.test', '33333333-3333-4333-8333-333333333333': 'stranger@example.test' };
let extractionCalls = 0;
class MockExtractionError extends Error {}
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
Module._load = function(request, parent, isMain) {
  if (request === 'server-only') return {};
  if (request === '@clerk/nextjs/server') return {
    auth: async () => ({ userId: clerkActor?.id || null, sessionId: clerkActor ? 'sess_synthetic' : null }),
    currentUser: async () => clerkActor,
    clerkClient: async () => ({ sessions: { revokeSession: async () => { clerkActor = null; } } }),
  };
  if (request === 'next/headers') return { cookies: async () => ({ get: key => jar.has(key) ? { value: jar.get(key) } : undefined, getAll: () => [...jar].map(([name, value]) => ({ name, value })), set: (key, value, options) => options?.maxAge === 0 ? jar.delete(key) : jar.set(key, value), delete: key => jar.delete(key) }) };
  if (request === '@/lib/extraction') return { ExtractionError: MockExtractionError, getExtractionConfig: () => 'synthetic-extraction-v2', extractDocument: async ({ bytes }) => { extractionCalls++; return { text: 'Original synthetic text', pages: [{ page: 1, text: 'Original synthetic text', method: 'native' }], method: 'native', config: 'synthetic-extraction-v2', sha256: validation.fingerprint(bytes) }; } };
  if (request.startsWith('@/')) request = path.join(root, request.slice(2));
  return originalLoad.call(this, request, parent, isMain);
};
const permissions = require('../lib/cases/permissions.ts');
const validation = require('../lib/cases/validation.ts');
const server = require('../lib/cases/server.ts');
const items = require('../lib/cases/items.ts');
const exporter = require('../lib/cases/export.ts');
const pdf = require('../lib/cases/pdf.ts');
const { updateSession } = require('../utils/supabase/middleware.ts');
const { NextRequest } = require('next/server');
const routes = {
  session: require('../app/api/auth/session/route.ts'),
  detail: require('../app/api/cases/[id]/route.ts'),
  sharing: require('../app/api/cases/[id]/sharing/route.ts'),
  invites: require('../app/api/cases/invitations/route.ts'),
  documents: require('../app/api/cases/[id]/documents/route.ts'),
  document: require('../app/api/cases/[id]/documents/[itemId]/route.ts'),
};
const ids = { owner: '11111111-1111-4111-8111-111111111111', advocate: '22222222-2222-4222-8222-222222222222', stranger: '33333333-3333-4333-8333-333333333333', case: '44444444-4444-4444-8444-444444444444', other: '55555555-5555-4555-8555-555555555555', doc: '66666666-6666-4666-8666-666666666666', hidden: '77777777-7777-4777-8777-777777777777', invite: '88888888-8888-4888-8888-888888888888' };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const accessToken = id => `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 })}.synthetic-signature`;
function sessionFor(id, extra = {}) {
  return { access_token: accessToken(id), refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id, email: 'owner@example.test', email_confirmed_at: '2026-01-01' }, ...extra };
}
function setActor(id, extra = {}) {
  jar.clear(); jar.set('sb-synthetic-auth-token', `base64-${encode(sessionFor(id, extra))}`);
  clerkActor = { id: clerkId(id), primaryEmailAddressId: 'email_synthetic', emailAddresses: [{ id: 'email_synthetic', emailAddress: emails[id] || 'new@example.test', verification: { status: 'verified' } }], externalId: null };
}
let tables, storageFiles, requests;
const record = () => ({ id: ids.case, owner_id: ids.owner, title: 'Synthetic case', description: 'Synthetic facts only', category: 'Civil', status: 'open', created_at: '2026-09-13T00:00:00Z', updated_at: '2026-09-13T00:00:00Z' });
const material = (extra = {}) => ({ id: ids.doc, case_id: ids.case, resource_id: ids.doc, version: 1, kind: 'document', title: 'Synthetic notice', content: '', metadata: { extracted_text: 'Respondent: Test Person\nYou must submit a reply. Hearing is on 2026-10-12.', storage_path: `${ids.case}/file`, sha256: validation.fingerprint(Buffer.from('original')), filename: 'notice.txt', mime_type: 'text/plain', size: 8 }, review_status: 'needs_review', reviewer_id: null, reviewed_at: null, created_by: ids.owner, updated_by: ids.owner, created_at: '2026-09-13T00:00:00Z', updated_at: '2026-09-13T00:00:00Z', deleted_at: null, ...extra });
const grant = (extra = {}) => ({ id: ids.invite, case_id: ids.case, email: 'advocate@example.test', permission: 'read', item_ids: [ids.doc], status: 'accepted', invited_by: ids.owner, accepted_by: ids.advocate, created_at: '', updated_at: '', ...extra });
function matches(row, query) {
  for (const [key, filter] of query) {
    if (['select', 'order', 'limit'].includes(key)) continue;
    if (key === 'or') continue;
    if (filter.startsWith('eq.') && String(row[key]) !== filter.slice(3)) return false;
    if (filter === 'is.null' && row[key] != null) return false;
    if (filter.startsWith('in.(') && !filter.slice(4, -1).split(',').includes(String(row[key]))) return false;
  }
  return true;
}
beforeEach(() => {
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_synthetic';
  process.env.CLERK_SECRET_KEY = 'sk_test_synthetic';
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL = 'https://synthetic.supabase.test';
  process.env.SUPABASE_ANON_KEY = 'synthetic-anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-service';
  jar = new Map(); setActor(ids.owner);
  tables = { justice_cases: [record()], justice_case_items: [material(), material({ id: ids.hidden, resource_id: ids.hidden, title: 'Unshared document' })], justice_case_invitations: [grant()], justice_case_activity: [], justice_case_reviews: [] };
  tables.justice_accounts = [ids.owner, ids.advocate, ids.stranger].map(id => ({ id, clerk_user_id: clerkId(id), supabase_user_id: null }));
  storageFiles = new Map([[`${ids.case}/file`, Buffer.from('original')]]);
  requests = [];
  extractionCalls = 0;
  global.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    requests.push({ url, method: init.method || 'GET', body: init.body });
    if (url.pathname === '/auth/v1/user') {
      const token = new Headers(init.headers).get('Authorization')?.replace('Bearer ', '');
      let id;
      try {
        const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
        if (token.endsWith('.synthetic-signature') && claims.exp > Date.now() / 1000) id = claims.sub;
      } catch {}
      const emails = { [ids.owner]: 'owner@example.test', [ids.advocate]: 'advocate@example.test', [ids.stranger]: 'stranger@example.test' };
      return Response.json(emails[id] ? { id, email: emails[id], email_confirmed_at: '2026-01-01' } : { error: 'invalid token' }, { status: emails[id] ? 200 : 401 });
    }
    if (url.pathname === '/auth/v1/token') return Response.json(sessionFor(ids.owner));
    if (url.pathname === '/auth/v1/logout') return new Response(null, { status: 204 });
    if (url.pathname === '/storage/v1/object/justice-case-documents' && init.method === 'DELETE') {
      for (const name of JSON.parse(init.body).prefixes) storageFiles.delete(name);
      return Response.json([]);
    }
    if (url.pathname.startsWith('/storage/v1/object/justice-case-documents/')) {
      const name = decodeURIComponent(url.pathname.split('/justice-case-documents/')[1]);
      if (init.method === 'POST') { storageFiles.set(name, Buffer.from(init.body)); return Response.json({ key: name }); }
      if (init.method === 'DELETE') { storageFiles.delete(name); return Response.json({}); }
      return storageFiles.has(name) ? new Response(storageFiles.get(name)) : Response.json({}, { status: 404 });
    }
    const table = url.pathname.split('/').pop();
    if (!tables[table]) throw new Error(`Unexpected test endpoint ${url.pathname}`);
    let rows = tables[table].filter(row => matches(row, url.searchParams));
    if (init.method === 'POST') {
      const body = JSON.parse(init.body);
      const row = { id: randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null, version: 1, reviewer_id: null, reviewed_at: null, ...body };
      tables[table].push(row); rows = [row];
    } else if (init.method === 'PATCH') {
      const body = JSON.parse(init.body);
      rows.forEach(row => Object.assign(row, body));
    } else {
      const order = url.searchParams.get('order');
      if (order) { const [field, direction] = order.split('.'); rows = [...rows].sort((a, b) => (a[field] > b[field] ? 1 : -1) * (direction === 'desc' ? -1 : 1)); }
      if (url.searchParams.has('limit')) rows = rows.slice(0, Number(url.searchParams.get('limit')));
    }
    return Response.json(rows);
  };
});
after(() => { global.fetch = originalFetch; Module._load = originalLoad; if (originalTs) require.extensions['.ts'] = originalTs; else delete require.extensions['.ts']; });

test('ownership and explicit version whitelist never grant future uploads', () => {
  assert.equal(permissions.casePermission(record(), [grant()], ids.owner), 'owner');
  assert.equal(permissions.itemPermission(record(), [grant()], ids.advocate, material()), 'read');
  assert.equal(permissions.itemPermission(record(), [grant()], ids.advocate, material({ id: ids.hidden, version: 2 })), null);
  assert.equal(permissions.itemPermission(record(), [grant({ status: 'revoked' })], ids.advocate, material()), null);
  assert.equal(permissions.itemPermission(record(), [grant()], ids.advocate, material({ case_id: ids.other })), null);
});
test('edit privilege on one selected item does not elevate another read-only item', () => {
  const grants = [grant(), grant({ id: randomUUID(), permission: 'edit', item_ids: [ids.hidden] })];
  assert.equal(permissions.itemPermission(record(), grants, ids.advocate, material()), 'read');
  assert.equal(permissions.itemPermission(record(), grants, ids.advocate, material({ id: ids.hidden })), 'edit');
});
test('protected API rejects missing or forged sessions and guessed case IDs', async () => {
  jar.clear(); clerkActor = null;
  assert.equal((await routes.detail.GET(new Request('https://justice.test/api/cases/' + ids.case), { params: { id: ids.case } })).status, 401);
  jar.set('justice_access', 'forged-owner-token');
  jar.set('sb-synthetic-auth-token', `base64-${encode(sessionFor(ids.owner))}`);
  assert.equal((await routes.detail.GET(new Request('https://justice.test/api/cases/' + ids.case), { params: { id: ids.case } })).status, 401);
  setActor(ids.stranger);
  assert.equal((await routes.detail.GET(new Request('https://justice.test/api/cases/' + ids.case), { params: { id: ids.case } })).status, 404);
});
test('case detail strips private storage path and unshared material', async () => {
  setActor(ids.advocate);
  const response = await routes.detail.GET(new Request('https://justice.test/api/cases/' + ids.case), { params: { id: ids.case } });
  const body = await response.json();
  assert.equal(response.status, 200); assert.equal(body.items.length, 1);
  assert.equal(body.items[0].metadata.storage_path, undefined);
  assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
});
test('cross-origin authenticated mutations are denied before database writes', async () => {
  const response = await routes.detail.PATCH(new Request('https://justice.test/api/cases/' + ids.case, { method: 'PATCH', headers: { Origin: 'https://attacker.test' }, body: JSON.stringify({ title: 'Changed' }) }), { params: { id: ids.case } });
  assert.equal(response.status, 403); assert.equal(requests.length, 0);
});
test('invitations require matching verified email and become inaccessible after revocation', async () => {
  tables.justice_case_invitations[0] = grant({ status: 'pending', accepted_by: null });
  const makeRequest = () => new Request('https://justice.test/api/cases/invitations', { method: 'POST', body: JSON.stringify({ id: ids.invite, action: 'accept' }) });
  setActor(ids.stranger);
  assert.equal((await routes.invites.POST(makeRequest(), { params: {} })).status, 404);
  setActor(ids.advocate);
  assert.equal((await routes.invites.POST(makeRequest(), { params: {} })).status, 200);
  assert.equal((await server.context(ids.case)).permission, 'read');
  setActor(ids.owner);
  const revoked = await routes.sharing.PATCH(new Request('https://justice.test/api/cases/' + ids.case + '/sharing', { method: 'PATCH', body: JSON.stringify({ id: ids.invite, action: 'revoke' }) }), { params: { id: ids.case } });
  assert.equal(revoked.status, 200);
  setActor(ids.advocate);
  await assert.rejects(server.context(ids.case), error => error.status === 404);
});
test('original downloads reject hidden material and detect storage fingerprint changes', async () => {
  setActor(ids.advocate);
  const get = itemId => routes.document.GET(new Request('https://justice.test/download'), { params: { id: ids.case, itemId } });
  assert.equal((await get(ids.hidden)).status, 404);
  assert.equal((await get(ids.doc)).status, 200);
  storageFiles.set(`${ids.case}/file`, Buffer.from('modified'));
  assert.equal((await get(ids.doc)).status, 409);
});
test('file validation rejects extension spoofing, traversal, binary text and oversize files', () => {
  assert.equal(validation.MAX_FILE_SIZE, 3 * 1024 * 1024);
  assert.throws(() => validation.validateFile(Buffer.from('text'), '../notice.txt'));
  assert.throws(() => validation.validateFile(Buffer.from('not a PDF'), 'notice.pdf'));
  assert.throws(() => validation.validateFile(Buffer.from([0, 1, 2]), 'notice.txt'));
  assert.throws(() => validation.validateFile(Buffer.alloc(validation.MAX_FILE_SIZE + 1), 'notice.txt'));
  assert.equal(validation.validateFile(Buffer.from('न्याय'), 'notice.txt').mime, 'text/plain');
  assert.notEqual(validation.fingerprint(Buffer.from('a')), validation.fingerprint(Buffer.from('b')));
});
test('editing a reviewed draft creates a new version requiring review', async () => {
  tables.justice_case_items[0] = material({ kind: 'draft', content: 'Old draft', review_status: 'reviewed', reviewer_id: ids.owner, reviewed_at: '2026-09-13T01:00:00Z', metadata: {} });
  const updated = await items.changeItem(await server.context(ids.case), ids.doc, { action: 'update', content: 'Corrected draft' });
  assert.notEqual(updated.id, ids.doc); assert.equal(updated.version, 2);
  assert.equal(updated.review_status, 'needs_review'); assert.equal(updated.reviewer_id, null);
  assert.equal(tables.justice_case_items[0].content, 'Old draft'); assert.equal(tables.justice_case_items[0].review_status, 'reviewed');
});
test('read collaborator cannot edit or mark material reviewed', async () => {
  setActor(ids.advocate);
  const ctx = await server.context(ids.case);
  await assert.rejects(items.changeItem(ctx, ids.doc, { action: 'review', review_status: 'reviewed' }), e => e.status === 403);
  await assert.rejects(items.changeItem(ctx, ids.doc, { action: 'update', content: 'Edited' }), e => e.status === 403);
});
test('generated facts contain exact source excerpts and never infer statutory deadlines', () => {
  const text = 'Respondent: Example Person\nYou must submit a reply within 15 days. Hearing 2026-10-12. Invalid 2026-02-30.';
  const facts = permissions.proposeSourceFacts(text);
  assert(facts.some(f => f.metadata.date === '2026-10-12'));
  assert(facts.some(f => f.metadata.parties?.includes('Example Person')));
  assert(facts.some(f => f.kind === 'task'));
  facts.forEach(f => { assert(text.includes(f.metadata.source_excerpt)); assert.equal(f.metadata.confirmation, 'pending_review'); });
  assert(!facts.some(f => f.metadata.date === '2026-02-30'));
  facts.filter(f => f.kind === 'task').forEach(f => assert.equal(f.metadata.due_date, null));
});
test('timeline creation rejects fabricated excerpts and unauthorized source versions', async () => {
  const ctx = await server.context(ids.case);
  await assert.rejects(items.createItem(ctx, { kind: 'timeline', title: 'Fake event', metadata: { source_item_id: ids.doc, source_excerpt: 'Invented content', date_type: 'unknown' } }), e => e.status === 400);
  setActor(ids.advocate); tables.justice_case_invitations[0].permission = 'edit';
  await assert.rejects(items.createItem(await server.context(ids.case), { kind: 'timeline', title: 'Hidden source', metadata: { source_item_id: ids.hidden, source_excerpt: 'Respondent: Test Person', date_type: 'unknown' } }), e => e.status === 404);
});
test('reviewed bundle rejects unshared versions, unreviewed drafts and unconfirmed events', async () => {
  setActor(ids.advocate);
  await assert.rejects(exporter.selectedForExport(await server.context(ids.case), [ids.hidden]), e => e.status === 404);
  setActor(ids.owner);
  tables.justice_case_items[0] = material({ kind: 'draft', metadata: {}, review_status: 'needs_review' });
  await assert.rejects(exporter.selectedForExport(await server.context(ids.case), [ids.doc]), e => e.status === 409);
  tables.justice_case_items[0] = material({ kind: 'timeline', metadata: { confirmation: 'pending_review' } });
  await assert.rejects(exporter.selectedForExport(await server.context(ids.case), [ids.doc]), e => e.status === 409);
});
test('bundle HTML escapes stored text and preserves Unicode; ZIP has real directory records', async () => {
  const ctx = await server.context(ids.case);
  ctx.record.description = '<script>alert(1)</script> न्याय';
  const html = exporter.bundleHtml(ctx, [material()]);
  assert(html.includes('&lt;script&gt;')); assert(!html.includes('<script>')); assert(html.includes('न्याय')); assert(html.includes('@page'));
  const zip = exporter.zipFiles([{ name: 'न्याय.txt', data: Buffer.from('Private synthetic fixture') }]);
  assert.equal(zip.readUInt32LE(0), 0x04034b50); assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50); assert.equal(zip.readUInt16LE(zip.length - 12), 1);
});
test('migration enforces atomic activity/review triggers and denies direct browser table grants', () => {
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/202609130001_cases.sql'), 'utf8');
  for (const table of ['justice_cases', 'justice_case_items', 'justice_case_invitations', 'justice_case_activity', 'justice_case_reviews']) assert(sql.includes(`alter table public.${table} enable row level security`));
  assert(sql.includes('after insert or update on public.justice_case_items'));
  assert(sql.includes('before update or delete on public.justice_case_activity'));
  assert(sql.includes('before update or delete on public.justice_case_reviews'));
  assert(sql.includes('from anon, authenticated'));
  assert(sql.includes('Content changes require a new version'));
  assert(sql.includes('on storage.objects as restrictive'));
  assert(sql.includes("using (bucket_id <> 'justice-case-documents')"));
});
test('saved provenance is bounded, strips arbitrary fields, and rejects demo results', async () => {
  const ctx = await server.context(ids.case);
  const result = await items.createItem(ctx, { kind: 'analysis', title: 'Live result', metadata: { source: 'gemini', urgency: 'High', deadline_date: '2026-10-12', deadline_status: 'confirmed', ai: { provider: 'gemini', model: 'test-model', fallback: true, attempts: 2, secret: 'must-not-save' }, api_key: 'must-not-save' } });
  assert.equal(result.metadata.source, 'gemini'); assert.equal(result.metadata.deadline_status, 'unconfirmed');
  assert.equal(result.metadata.api_key, undefined); assert.equal(result.metadata.ai.secret, undefined);
  await assert.rejects(items.createItem(ctx, { kind: 'analysis', title: 'Demo', metadata: { source: 'mock' } }), e => e.status === 400);
});
test('extraction cache requires matching version fingerprint and configuration', async () => {
  const request = () => new Request('https://justice.test/extract', { method: 'POST', body: JSON.stringify({ action: 'extract' }) });
  const params = { params: { id: ids.case, itemId: ids.doc } };
  assert.equal((await routes.document.POST(request(), params)).status, 200); assert.equal(extractionCalls, 1);
  const cached = await routes.document.POST(request(), params); assert.equal((await cached.json()).cached, true); assert.equal(extractionCalls, 1);
  tables.justice_case_items[0].metadata.extraction_config = 'old-config';
  assert.equal((await routes.document.POST(request(), params)).status, 200); assert.equal(extractionCalls, 2);
  setActor(ids.stranger);
  assert.equal((await routes.document.POST(request(), params)).status, 404); assert.equal(extractionCalls, 2);
});
test('direct PDF embeds Indic fonts and page numbers without extra blank footer pages', async () => {
  const ctx = await server.context(ids.case);
  ctx.record.description = 'हिंदी: न्याय और अधिकार। कृपया अपना जवाब प्रस्तुत करें।\nमराठी: कागदपत्रे सादर करा.\nবাংলা: ন্যায়বিচার এবং অধিকার।';
  const bytes = await pdf.bundlePdf(ctx, []);
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  assert(bytes.toString('latin1').includes('/FontFile2'));
  assert.equal((bytes.toString('latin1').match(/\/Type \/Page\b/g) || []).length, 1);
  ctx.record.description = 'Unsupported symbol: 🦄';
  await assert.rejects(pdf.bundlePdf(ctx, []), e => e.status === 422 && e.code === 'PDF_FONT_UNSUPPORTED');
});
test('Clerk session API resolves the case identity, async parameters and sign-out', async () => {
  const session = await routes.session.GET(new Request('https://justice.test/api/auth/session'));
  assert.equal(session.status, 200);
  const body = await session.json();
  assert.equal(body.provider, 'clerk'); assert.equal(body.user.id, ids.owner);
  const legacySignIn = await routes.session.POST(new Request('https://justice.test/api/auth/session', { method: 'POST', body: JSON.stringify({ action: 'signin', email: 'owner@example.test', password: 'synthetic-password' }) }));
  assert.equal(legacySignIn.status, 409);
  const response = await routes.detail.GET(new Request('https://justice.test/api/cases/' + ids.case), { params: Promise.resolve({ id: ids.case }) });
  assert.equal(response.status, 200); assert.equal((await response.json()).case.id, ids.case);
  const signedOut = await routes.session.POST(new Request('https://justice.test/api/auth/session', { method: 'POST', body: JSON.stringify({ action: 'signout' }) }));
  assert.equal(signedOut.status, 200);
  assert.equal(clerkActor, null);
  assert.equal((await routes.detail.GET(new Request('https://justice.test/case'), { params: Promise.resolve({ id: ids.case }) })).status, 401);
});
test('Vercel ZIP limit rejects oversized selections before loading private originals', async () => {
  const previous = process.env.VERCEL;
  process.env.VERCEL = '1';
  try {
    tables.justice_case_items[0].metadata.size = 4 * 1024 * 1024;
    await assert.rejects(exporter.exportBundle(await server.context(ids.case), { itemIds: [ids.doc], format: 'zip' }), e => e.status === 413);
    assert.equal(requests.some(request => request.url.pathname.startsWith('/storage/')), false);
  } finally {
    if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous;
  }
});

test('Clerk sign-in works independently of case storage configuration', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://synthetic.supabase.test';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_synthetic';
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await routes.session.GET(new Request('https://justice.test/api/auth/session'));
  const body = await response.json();
  assert.equal(body.authConfigured, true);
  assert.equal(body.configured, false);
  assert.equal(body.user.id, clerkId(ids.owner));
  await assert.rejects(server.db('justice_cases'), error => error.status === 503 && error.code === 'SETUP_REQUIRED');
});

test('case authorization ignores the user identity stored in SSR cookies', async () => {
  setActor(ids.stranger, { user: sessionFor(ids.owner).user });
  const response = await routes.detail.GET(new Request('https://justice.test/api/cases/' + ids.case), { params: Promise.resolve({ id: ids.case }) });
  assert.equal(response.status, 404);
});

test('new Clerk accounts get a stable UUID without inheriting cases from a matching email', async () => {
  setActor(randomUUID());
  clerkActor.emailAddresses[0].emailAddress = 'owner@example.test';
  const first = await server.currentUser();
  const second = await server.currentUser();
  assert.equal(first.id, second.id);
  assert.notEqual(first.id, ids.owner);
  assert.equal(validation.uuid(first.id), first.id);
  await assert.rejects(server.context(ids.case), error => error.status === 404);
});

test('administrator-imported identities retain existing ownership without reassigning another link', async () => {
  tables.justice_accounts[0].clerk_user_id = null;
  tables.justice_accounts[0].supabase_user_id = ids.owner;
  setActor(randomUUID());
  clerkActor.externalId = ids.owner;
  assert.equal((await server.currentUser()).id, ids.owner);
  assert.equal((await server.context(ids.case)).permission, 'owner');
  const linkedId = clerkActor.id;
  setActor(randomUUID()); clerkActor.externalId = ids.owner;
  await assert.rejects(server.currentUser(), error => error.status === 409);
  assert.equal(tables.justice_accounts[0].clerk_user_id, linkedId);
});

test('editable Clerk metadata and unverified email cannot claim an existing account', async () => {
  tables.justice_accounts[0].clerk_user_id = null;
  tables.justice_accounts[0].supabase_user_id = ids.owner;
  setActor(randomUUID());
  clerkActor.unsafeMetadata = { externalId: ids.owner, user_id: ids.owner };
  assert.notEqual((await server.currentUser()).id, ids.owner);
  assert.equal(tables.justice_accounts[0].clerk_user_id, null);
  clerkActor.emailAddresses[0].verification.status = 'unverified';
  await assert.rejects(server.currentUser(), error => error.status === 403 && error.code === 'EMAIL_VERIFICATION_REQUIRED');
});

test('first-request account conflicts re-read only the verified Clerk subject', async () => {
  setActor(randomUUID());
  const transport = global.fetch;
  const assignedId = randomUUID();
  global.fetch = async (input, init = {}) => {
    if (String(input).includes('/justice_accounts?') && init.method === 'POST') {
      tables.justice_accounts.push({ id: assignedId, clerk_user_id: clerkActor.id, supabase_user_id: null });
      return Response.json({ code: '23505' }, { status: 409 });
    }
    return transport(input, init);
  };
  assert.equal((await server.currentUser()).id, assignedId);
});

test('missing Clerk configuration never accepts an old Supabase session', async () => {
  delete process.env.CLERK_SECRET_KEY;
  assert.equal(await server.currentUser(false), null);
  await assert.rejects(server.currentUser(), error => error.status === 503 && error.code === 'SETUP_REQUIRED');
  assert.equal(requests.length, 0);
});

test('parallel legacy linking accepts the same Clerk subject and rejects a different one', async () => {
  tables.justice_accounts[0].clerk_user_id = null;
  tables.justice_accounts[0].supabase_user_id = ids.owner;
  setActor(randomUUID()); clerkActor.externalId = ids.owner;
  const transport = global.fetch;
  let winner = clerkActor.id;
  global.fetch = async (input, init = {}) => {
    if (String(input).includes('/justice_accounts?') && init.method === 'PATCH') {
      tables.justice_accounts[0].clerk_user_id = winner;
      return Response.json([]);
    }
    return transport(input, init);
  };
  assert.equal((await server.currentUser()).id, ids.owner);
  tables.justice_accounts[0].clerk_user_id = null;
  winner = 'user_someoneelse';
  await assert.rejects(server.currentUser(), error => error.status === 409);
});

test('middleware refreshes expired sessions for both downstream requests and the browser', async () => {
  setActor(ids.owner, { expires_at: Math.floor(Date.now() / 1000) - 60 });
  const request = new NextRequest('https://justice.test/cases', { headers: { cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; ') } });
  const previousCookie = request.cookies.get('sb-synthetic-auth-token').value;
  const response = await updateSession(request);
  assert(requests.some(request => request.url.pathname === '/auth/v1/token' && request.url.searchParams.get('grant_type') === 'refresh_token'));
  assert(requests.some(request => request.url.pathname === '/auth/v1/user'));
  const refreshed = response.cookies.get('sb-synthetic-auth-token');
  assert(refreshed && refreshed.value !== previousCookie);
  assert.equal(request.cookies.get(refreshed.name).value, refreshed.value);
  assert(response.headers.get('x-middleware-request-cookie').includes(refreshed.value));
  assert.match(response.headers.get('cache-control'), /private.*no-store/);
});

test('middleware stays available when Supabase setup is absent', async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  const response = await updateSession(new NextRequest('https://justice.test/sign-in'));
  assert.equal(response.status, 200);
  assert.equal(requests.length, 0);
  assert.equal(response.cookies.getAll().length, 0);
});

test('modern server secret stays in the apikey header and out of Bearer', async () => {
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_synthetic';
  const transport = global.fetch;
  global.fetch = async (input, init) => {
    const headers = new Headers(init.headers);
    assert.equal(headers.get('apikey'), 'sb_secret_synthetic');
    assert.equal(headers.get('authorization'), null);
    return transport(input, init);
  };
  await server.db('justice_cases');
  await server.storage(`${ids.case}/file`);
});

test('server storage works with a project URL and server secret without an anon key', async () => {
  delete process.env.SUPABASE_ANON_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL;
  delete process.env.SUPABASE_URL;
  assert.equal(server.configured(), true);
  assert.equal((await server.currentUser()).id, ids.owner);
  await server.storage(`${ids.case}/file`);
});

test('a public key cannot be used as the elevated Storage credential', async () => {
  process.env.SUPABASE_SECRET_KEY = 'sb_publishable_not_a_server_secret';
  assert.equal(server.configured(), false);
  await assert.rejects(server.storage(`${ids.case}/file`), e => e.status === 503);
  assert.equal(requests.length, 0);
});

function uploadRequest() {
  const form = new FormData();
  form.set('file', new File(['Synthetic private upload'], 'notice.txt', { type: 'text/plain' }));
  return new Request('https://justice.test/api/cases/' + ids.case + '/documents', { method: 'POST', body: form });
}
test('authenticated upload saves immutable bytes and their database fingerprint', async () => {
  const response = await routes.documents.POST(uploadRequest(), { params: Promise.resolve({ id: ids.case }) });
  assert.equal(response.status, 201);
  const { item } = await response.json();
  assert.equal(item.metadata.storage_path, undefined);
  const saved = tables.justice_case_items.find(row => row.id === item.id);
  assert.equal(saved.created_by, ids.owner);
  assert.equal(validation.fingerprint(storageFiles.get(saved.metadata.storage_path)), saved.metadata.sha256);
});

test('failed upload metadata insert removes the original using the Storage prefixes API', async () => {
  const transport = global.fetch;
  global.fetch = async (input, init = {}) => {
    if (String(input).includes('/rest/v1/justice_case_items?') && init.method === 'POST') return Response.json({ code: 'XX000' }, { status: 503 });
    return transport(input, init);
  };
  const response = await routes.documents.POST(uploadRequest(), { params: Promise.resolve({ id: ids.case }) });
  assert.equal(response.status, 503);
  assert.equal(storageFiles.size, 1);
  const cleanup = requests.find(request => request.method === 'DELETE');
  assert.equal(cleanup.url.pathname, '/storage/v1/object/justice-case-documents');
  assert.equal(JSON.parse(cleanup.body).prefixes.length, 1);
});

test('missing bucket and denied Storage credentials produce actionable distinct errors', async () => {
  global.fetch = async () => Response.json({ code: 'NoSuchBucket', message: 'Bucket not found' }, { status: 404 });
  await assert.rejects(server.storage(`${ids.case}/file`), e => e.code === 'STORAGE_BUCKET_MISSING');
  global.fetch = async () => Response.json({ message: 'private upstream details' }, { status: 403 });
  await assert.rejects(server.storage(`${ids.case}/file`), e => e.code === 'STORAGE_ACCESS_DENIED' && !e.message.includes('upstream'));
});

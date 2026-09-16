import nextEnv from '@next/env';
import { randomUUID } from 'node:crypto';

// Load settings for execution only. Never log keys, tokens, or environment files.
nextEnv.loadEnvConfig(process.cwd());
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
const secret = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const bucket = 'justice-case-documents';
const missing = [];
if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
if (!secret) missing.push('SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY (server-only)');
if (missing.length) {
  console.error('Storage setup is incomplete. Add to .env.local or the hosting environment:');
  missing.forEach(name => console.error(`- ${name}`));
  console.error('A publishable/anon key cannot authorize private case uploads. Do not disable RLS.');
  process.exit(1);
}
let target;
try { target = new URL(url); } catch { console.error('The Supabase project URL is invalid.'); process.exit(1); }
if ((target.protocol !== 'https:' && !(target.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))) || target.username || target.password || target.search || target.hash || target.pathname !== '/') {
  console.error('Use the Supabase project origin, without API paths, credentials or query parameters.'); process.exit(1);
}
let legacyRole;
try { if (secret.split('.').length === 3) legacyRole = JSON.parse(Buffer.from(secret.split('.')[1], 'base64url')).role; } catch { legacyRole = 'invalid'; }
if (secret.startsWith('sb_publishable_') || (secret.split('.').length === 3 && legacyRole !== 'service_role')) {
  console.error('The configured server credential is not a Supabase secret/service-role key.'); process.exit(1);
}
const headers = { apikey: secret, ...(!secret.startsWith('sb_secret_') ? { Authorization: `Bearer ${secret}` } : {}) };
async function request(path, init = {}) {
  return fetch(`${url}${path}`, { ...init, headers: { ...headers, ...init.headers }, signal: AbortSignal.timeout(15000), cache: 'no-store' });
}
async function problem(response, label) {
  const body = await response.json().catch(() => ({}));
  const code = typeof body.code === 'string' && /^[A-Za-z0-9_]+$/.test(body.code) ? body.code : 'unavailable';
  console.error(`FAIL ${label}: HTTP ${response.status}, code ${code}. Check migrations, server key and service_role grants.`);
}
let failed = false;
try {
  for (const table of ['justice_accounts', 'justice_cases', 'justice_case_items', 'justice_case_invitations', 'justice_case_activity', 'justice_case_reviews']) {
    const response = await request(`/rest/v1/${table}?select=id&limit=1`, { method: 'HEAD' });
    if (response.ok) console.log(`PASS ${table}: Data API accessible by server`);
    else { failed = true; await problem(response, table); }
  }
  let response = await request(`/storage/v1/bucket/${bucket}`);
  let details = await response.json().catch(() => ({}));
  const absent = response.status === 404 || details.code === 'NoSuchBucket' || /bucket.*not found/i.test(String(details.message));
  if (absent && process.argv.includes('--create-bucket')) {
    response = await request('/storage/v1/bucket', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: bucket, name: bucket, public: false, file_size_limit: 3 * 1024 * 1024, allowed_mime_types: ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'] }) });
    if (!response.ok) { await problem(response, 'create private bucket'); failed = true; }
    response = await request(`/storage/v1/bucket/${bucket}`);
    details = await response.json().catch(() => ({}));
  }
  if (!response.ok) { failed = true; console.error(`FAIL private bucket: HTTP ${response.status}. Run npm run storage:setup after applying the migrations.`); }
  else if (details.public !== false) { failed = true; console.error('FAIL document bucket is public. Make justice-case-documents private in the Supabase dashboard.'); }
  else {
    console.log('PASS private document bucket exists');
    const supported = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'];
    if ((details.file_size_limit != null && Number(details.file_size_limit) < 3 * 1024 * 1024) || (Array.isArray(details.allowed_mime_types) && supported.some(type => !details.allowed_mime_types.includes(type)))) {
      failed = true; console.error('FAIL bucket restrictions do not permit all supported file types up to 3 MB. Update bucket settings in the dashboard.');
    }
    if (process.argv.includes('--verify-upload')) {
      const path = `_diagnostics/${randomUUID()}.txt`;
      const content = 'Justice AI non-sensitive storage connectivity check.';
      let uploaded = false;
      try {
        const uploadedResponse = await request(`/storage/v1/object/${bucket}/${path}`, { method: 'POST', headers: { 'Content-Type': 'text/plain', 'x-upsert': 'false' }, body: content });
        if (!uploadedResponse.ok) { failed = true; await problem(uploadedResponse, 'synthetic upload'); }
        else {
          uploaded = true;
          const downloaded = await request(`/storage/v1/object/${bucket}/${path}`);
          if (downloaded.ok && await downloaded.text() === content) console.log('PASS synthetic private upload/download and byte comparison');
          else { failed = true; console.error('FAIL synthetic download or byte comparison'); }
        }
      } finally {
        if (uploaded) {
          const removed = await request(`/storage/v1/object/${bucket}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [path] }) });
          if (!removed.ok) { failed = true; console.error(`FAIL cleanup: remove ${path} from the private bucket.`); }
          else console.log('PASS synthetic upload removed');
        }
      }
    }
  }
} catch { failed = true; console.error('Storage could not be reached within 15 seconds. Check the project status, URL and network.'); }
console.log('This checks server connectivity; verify Clerk ownership, sharing and RLS with separate user accounts before deployment.');
process.exitCode = failed ? 1 : 0;

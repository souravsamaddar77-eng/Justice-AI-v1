# Repairing private case storage

Justice AI uses Clerk identities and its own authorized server API to access
Supabase. The public/anon key cannot upload private case files. The local check
on 16 September 2026 found the public project URL/key present and the server
secret absent. This prevents both saved cases and uploads before any RLS query.

## Configure the server

Add these settings to `.env.local` and your hosting environment. Keep existing
Clerk and AI settings. Never paste or commit secret values.

```ini
NEXT_PUBLIC_SUPABASE_URL=https://ulaleonbsjovyedcunzo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<project publishable key>
SUPABASE_SECRET_KEY=<project server-only secret>
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the
legacy `SUPABASE_SERVICE_ROLE_KEY` are supported aliases. Server case storage
only needs the URL and elevated secret; browser helpers need the public key.
Never put the server secret in a `NEXT_PUBLIC_` variable. Clerk remains the
application's sign-in provider.

Apply both existing SQL files in order in the project's SQL Editor, or use
`supabase db push` after authenticating/linking the Supabase CLI to this project:

1. `supabase/migrations/202609130001_cases.sql`
2. `supabase/migrations/20260913163546_clerk_case_accounts.sql`

Run `npm run storage:check`. It reports missing configuration, table access,
bucket visibility, and bucket limits without printing credentials or case data.
Restart/rebuild Next.js after changing its environment.

## Check the bucket and policies

In **Storage**, open `justice-case-documents`. Keep it **private**, with a limit
of at least 3 MB and these allowed MIME types: `application/pdf`, `image/png`,
`image/jpeg`, `text/plain`. `npm run storage:setup` creates a missing private
bucket with those settings. It does not overwrite an existing bucket or apply
SQL migrations.

Inspect policies in **Storage → Policies** and table RLS in the database UI.
For this architecture, do not add a blanket `authenticated` upload policy or
disable RLS. Clerk sessions do not become Supabase Auth users automatically.
Each upload goes through `/api/cases/:id/documents`, which verifies Clerk and
case/version permissions before using the server secret. Public clients are
intentionally denied direct access to case tables and this bucket.

These read-only SQL checks help inspect the migration:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename like 'justice_%';

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename like 'justice_%')
   or (schemaname = 'storage' and tablename = 'objects');

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name like 'justice_%';
```

Expect RLS enabled on all six `justice_*` tables, no direct browser table grants,
the migration's restrictive Storage guards excluding this bucket, and the
required `service_role` table grants. Service keys bypass RLS; the server API's
Clerk and item-permission checks remain essential. A 401/403 usually means the
wrong server key or missing grants; missing tables/bucket need setup rather than
a more permissive policy. See [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
and [API keys](https://supabase.com/docs/guides/getting-started/api-keys).

## Verify actual storage

Run `npm run storage:verify` after setup. It uploads a unique non-sensitive text
fixture, downloads and compares the exact bytes, and deletes that fixture using
Supabase's bucket endpoint with a `prefixes` payload. It never deletes user files.
The same endpoint now cleans up originals when the app's database insert fails.

Then use two real Clerk accounts to verify case creation, upload/download,
selected sharing, revocation, and refusal of guessed case IDs. Automated tests
cover these API contracts with injected identities/transport; they do not prove
that an unconfigured live project has applied the migrations.

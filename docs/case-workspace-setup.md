# Private case workspace setup

Justice AI uses Clerk for sign-in, Supabase PostgreSQL for saved cases, and a
private Supabase Storage bucket for originals. Existing standalone tools remain
public. Demo portal roles have no authority over saved case data.

The application targets Next.js 15.5.24. Its request helpers await the framework's
asynchronous route parameters and Clerk `auth()` API.

## Configure the backend

1. The Clerk CLI links this repository to application
   `app_3JHTLaXuRwyZkxfGKzrrfkyEwiR`. Run `clerk auth login`, then
   `clerk env pull --app app_3JHTLaXuRwyZkxfGKzrrfkyEwiR --file .env.local`,
   and `clerk doctor`. This writes the publishable and server-only secret keys.
   Development is configured; create a production instance before deployment.
2. Use the supplied Supabase project `ulaleonbsjovyedcunzo`. Apply
   `supabase/migrations/202609130001_cases.sql`, then
   `supabase/migrations/20260913163546_clerk_case_accounts.sql` in the SQL editor.
   With a linked Supabase CLI project, `supabase db push` applies the same
   migrations. These add app tables and preserve existing account/case UUIDs.
3. Copy the blank `.env.local.example` to a new local environment file only if
   one does not exist. Otherwise add these values without overwriting existing
   secrets:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   SUPABASE_SECRET_KEY=
   APP_URL=http://localhost:3000
   ```

   The public URL and publishable key configure the Supabase clients.
   Private case APIs require the server-only secret key;
   the legacy `SUPABASE_SERVICE_ROLE_KEY` is supported instead. Never give this
   elevated key a `NEXT_PUBLIC_` prefix. Existing server installations using
   `SUPABASE_URL` and `SUPABASE_ANON_KEY` remain supported. Configure the same values in the deployment host;
   production `APP_URL` must be the HTTPS origin serving Justice AI.
4. Configure sign-in methods and primary email verification in the Clerk
   Dashboard. `/sign-in` and `/sign-up` render Clerk forms; the navigation shows
   sign-in/create-account actions or a signed-in profile control. Verify your
   primary email before accessing private cases. Old `/auth/callback` links
   redirect to Clerk sign-in and never establish a Supabase case session.
5. Confirm that the `justice-case-documents` bucket is **private**. The migration
   creates it with a 3 MB upload limit and PDF, PNG, JPEG and text MIME types. Do not
   add public download policies for this bucket. The migration adds restrictive
   guards excluding this bucket from anonymous/authenticated Storage access,
   including when the project has pre-existing broad permissive policies.
6. Restart the server. `/api/auth/session` reports `authConfigured: true` once
   Clerk keys exist and `configured: true` once Supabase settings also exist.
   Sign-in works independently of case-storage configuration.
   These flags check environment presence; a successfully created case verifies
   database/migration connectivity. Missing configuration produces a setup
   message instead of silently switching to a demo database.

Configuration references:
[Clerk Next.js setup](https://clerk.com/docs/nextjs/getting-started/quickstart),
[securing the Data API](https://supabase.com/docs/guides/api/securing-your-api),
[private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals),
[service keys and Storage](https://supabase.com/docs/guides/storage/security/access-control).

## Access and persistence design

- Every protected API calls Clerk's awaited `auth()` and `currentUser()`,
  requires a verified primary email, and resolves the verified Clerk subject
  through the private `justice_accounts` table to an internal UUID. Browser
  metadata, email matches and old Supabase/custom cookies never assign case
  ownership. `clerkMiddleware` handles Clerk sessions and the `/__clerk` proxy;
  case APIs independently enforce user/grant checks. Mutations reject
  cross-origin requests and private responses disable caching.
- The second migration backfills existing Supabase user UUIDs and updates all
  case user foreign keys to `justice_accounts`, preserving ownership, accepted
  invitations and history. For a deliberate legacy-user import, an administrator
  must set the Clerk user's `externalId` to the original Supabase UUID **before
  that user's first private-case request**. Existing Clerk mappings are immutable;
  a later `externalId` change does not move cases. Reconciliation after first use
  requires an administrator to review both accounts and their records. Never
  migrate users by matching email alone.
- The Next.js server alone uses the secret/service role key. Table queries are scoped
  to the verified user's ownership or accepted case invitation. Each material
  operation independently checks its exact version permission. Guessing a
  case/material ID does not grant access. All private responses disable caches.
- The six app tables have RLS enabled and no grants or policies for `anon` or
  `authenticated`. This deliberately denies direct browser database access.
  Service role access bypasses RLS, so the API authorization layer is the
  application boundary; keep that key and server trusted. Ordinary users cannot
  edit audit/review rows. Database triggers append audit events atomically with
  case, material and invitation changes, and reject history update/deletion.
- Documents are stored under immutable random paths in private Storage.
  Downloads proxy authorized bytes without exposing a storage URL and verify
  SHA-256 again. Every request rechecks current access. No reusable public or
  long-lived signed link is issued. HTTP responses are short-lived, private and
  non-cacheable. Already downloaded files cannot be recalled after revocation.
- Document and saved-text edits produce separate versions. Editing a reviewed
  draft leaves the reviewed version intact and creates a new `needs_review`
  version. Each review records the exact item/version, actor, comments and
  server timestamp in an append-only review table.
- The database, private files, extraction derivatives and review history survive
  refresh, logout and separate authenticated sessions. Browser storage, process
  memory and the deployment filesystem are not used for private case persistence.
  Fonts may be cached in process memory; they are public static assets.

## Sharing and advocate handoff

An owner chooses an email address, exact material versions and read, comment or
edit access. The case title/description are disclosed with the invitation;
selected originals, text and versions are disclosed after acceptance. The
invitation appears in that email account's authenticated workspace. This
implementation does not send invitation email. An account with a different
verified email cannot accept it.

The directory and demo advocate selector do not establish a verified professional
identity. The owner must identify and invite the intended collaborator. This is
account-based collaboration; Justice AI does not certify professional enrolment.
Accepted read access permits viewing and downloading selected versions; comment
access permits notes and review comments; edit access permits work on authorized
material. Case identity, archival and sharing changes remain owner-only.

Invitations contain an immutable version whitelist. Owner uploads and subsequent
versions are not automatically added. A collaborator may access their own new
work while they retain an accepted invitation, allowing work to be returned for
owner review. Revoking every active invitation for a person ends future case
access. A separate active invitation continues to grant its explicitly chosen
scope. Permission on one item never elevates permission on another item.

## Documents, dates and exports

The vault validates filename, size and file signatures. Supported originals are
PDF, PNG, JPEG and UTF-8 TXT. Hash comparison is labelled “Matches uploaded
original”; this does not establish authenticity, truthfulness or admissibility.
New uploads and comparisons are limited to 3 MB, leaving room for transport
encoding under [Vercel's function payload limit](https://vercel.com/docs/functions/limitations).
Lowering the bucket upload limit does not modify existing files or versions;
their authenticated read paths remain in place.
Legacy originals larger than Vercel's response limit need a host that supports
their size for proxied downloads; they are retained without rewriting or deletion.

The final extraction pipeline reads text, extracts digital PDF text and uses
OCR.space for images/scanned pages only with explicit processing consent.
Manual transcription is labelled separately. Extraction is cached within the
case version only when the stored SHA-256 and extraction configuration match.
Failure retains the original and records an actionable error; retry or manual
entry is available. See the OCR configuration in `.env.local.example`.

Source proposals use deterministic rules over actual extracted text. They
identify explicit ISO or day/month/year dates, labelled parties and selected
action wording. Each proposal keeps an exact supporting excerpt and document
version; unknown dates remain unknown, proposed actions have no calculated due
date, and all proposals require confirmation. Rules do not infer statutory
deadlines. They are intentionally conservative and will miss unsupported prose
and date formats. Users can correct event details or add tasks themselves.

Reviewed bundles include only explicitly selected, currently authorized material.
Referenced source versions must also be currently accessible. Saved text needs
review and chronology needs confirmation before bundle export. Tasks keep their
completion and date confirmation labels. Exports include case summary,
chronology, document index, reviewed text, selected tasks and source references.

- **PDF:** direct, paginated A4 PDF with embedded licensed Noto fonts, review
  details and page numbers. Latin, Devanagari (including Hindi/Marathi) and
  Bengali scripts are supported. Unsupported glyphs cause an explicit error;
  no silent replacement boxes are generated.
- **Printable HTML:** an alternative with print CSS and device font shaping.
  Open it and choose Print / Save as PDF for other locally supported scripts.
- **ZIP:** selected original attachments, a fingerprint manifest and the
  printable reviewed bundle. The combined original size is limited to 3 MB on
  Vercel and 50 MB on other hosts. Vercel exports also check the final buffered
  response size and return a clear error above 4 MiB so users can select fewer
  materials or download originals separately.

No export is described as certified or automatically court-ready. Export and
download events are recorded in the activity history.

## API contracts

Shared types are in `types/cases.ts`.

| Endpoint | Method | Contract |
| --- | --- | --- |
| `/api/auth/session` | GET / POST | Configuration + Clerk user/case identity; POST `signout` revokes the Clerk session. Sign-in/up use Clerk UI. |
| `/api/cases` | GET / POST | Search/filter cases; create title/description/category/status |
| `/api/cases/:id` | GET / PATCH | Scoped detail; owner edits/archive |
| `/api/cases/:id/items` | POST | Save chat, analysis, draft, timeline, task or note |
| `/api/cases/:id/items/:itemId` | PATCH | `update`, `review`, `delete`; exact version checked |
| `/api/cases/:id/items/:itemId/download` | GET | Labelled text download, including unreviewed state |
| `/api/cases/:id/documents` | POST multipart | `file`, optional `title`, optional stable `resourceId` for a new version |
| `/api/cases/:id/documents/:itemId` | GET | Authorized original preview/download with fingerprint verification |
| Same document endpoint | POST multipart / JSON | Compare `file`; `extract`, `manual-text`, `propose-timeline` actions |
| `/api/cases/:id/sharing` | POST / PATCH | Invite exact `itemIds`; revoke invitation ID |
| `/api/cases/invitations` | GET / POST | Account invitations; accept/decline |
| `/api/cases/:id/export` | POST | Explicit `itemIds` and `format: pdf / html / zip` |

## Verification and external checks

`node --test tests/cases.test.cjs` runs deterministic tests for verified-session
boundaries, guessed IDs, case/item permission separation, whitelists, invitation
acceptance/revocation, source validation, fingerprints, version review, selected
exports, safe provenance, extraction caches and PDF fonts/pagination. Supabase
HTTP responses and Clerk identities are replaced with synthetic fixtures in that test process. The
SQL tests inspect migration invariants; they do not substitute for applying the
migration to a real PostgreSQL instance.

`node tests/case-pdf-fixture.cjs` creates a non-sensitive long PDF under
`tmp/pdfs/` for visual checking. The fixture was rendered with Poppler and all
eight pages were inspected, including mixed Latin/Devanagari/Bengali shaping,
long-text page breaks and page numbers.

Clerk development configuration passes `clerk doctor`; the supplied Supabase
public project settings are configured. No real app account was created by the
tests. The Supabase server secret is still absent, and migrations have not been
applied from this workspace. Complete these checks before live deployment:

1. Apply both migrations and verify all tables, triggers and private bucket.
2. Create and confirm separate owner, collaborator and unrelated Clerk accounts.
3. Save a case, upload originals and saved text; sign out and sign in in a
   different browser/session; confirm data survives and audit entries exist.
4. Verify the unrelated account receives 404 for guessed case, material and
   download IDs, and cannot access the tables or bucket with its user token.
5. Invite only one version, accept from the matching email, and verify other
   files/new versions remain hidden. Try accepting with the unrelated account.
6. Revoke access and verify subsequent case reads, extraction, downloads and
   exports fail. Confirm the restrictive Storage guards are installed.
7. Review a draft, edit it, and confirm a separate unreviewed version plus
   immutable review/audit rows. Confirm update/delete of those histories fails.
8. Export only selected authorized reviewed material and compare the original
   files with the ZIP fingerprint manifest. Exercise Clerk session expiry/sign-out.

Live OCR/provider checks are reported separately from deterministic case tests;
configuration presence alone is never reported as a successful live check.

## Client helpers

`utils/supabase/client.ts` creates a browser client from public settings.
`utils/supabase/server.ts` creates a fresh server client from `await cookies()`.
The previously requested `utils/supabase/middleware.ts` helper remains available
but is not wired into root middleware: Clerk now handles application sign-in.
These Supabase helpers cannot authorize private case access.

The server helper supports the supplied Server Component pattern:

```tsx
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

const supabase = createClient(await cookies())
const { data: { user } } = await supabase.auth.getUser()
```

The example `todos` table is not part of Justice AI, so the existing homepage is
preserved. Private case tables continue to use the authorized server API; the
browser/public-key client cannot query them directly. See the official
[SSR client guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
and [API key guide](https://supabase.com/docs/guides/getting-started/api-keys).

# Justice AI implementation record

## Baseline

Inspected actual App Router code on 13 September 2026. Working tree was clean. `npx tsc --noEmit` and `npm run build` passed before edits. Next.js 14.2.5, React 18, Tailwind, Gemini, NVIDIA, OCR.space, pdfjs-dist and jsPDF are present. There is no authentication or persistent database.

Existing pages: `/`, `/portal`, `/victim-citizen`, `/citizen`, `/citizen/voice-assistant`, `/citizen/action-tracker`, `/citizen/lawyers`, `/advocate`, `/advocate/cases`, `/advocate/draft-review`, `/advocate/network`, `/advocate/precedents`.

Existing APIs: POST `/api/chat`, `/api/analyze-document`, `/api/draft-document`; GET `/api/health`, `/api/lok-adalat`; `/health` rewrite. JSON contracts and standalone access are preserved, with live failures now intended to be explicit. Static directories, intake, anomaly review and action tracker contain demonstrations.

## Work allocation and order

1. Case backend: managed authentication, Postgres migrations, private file storage, resource permissions, immutable versions, sharing, source records, reviews, activity and exports.
2. Case workspace: authenticated list/detail, practical forms, per-case tabs, selected sharing/export, optional save actions.
3. AI: real provider fallback, consent, bounded requests, streaming/cancellation, honest demo separation and deterministic tests.
4. Integration/design: navigation, focused standalone tools, shared visual system, regression checks and delivery documentation.
5. OCR last, after checking additions: extraction repair, synthetic fixtures and live verification where credentials permit.

The latest direct request authorizes modernization of the frontend, superseding the attachment's styling-preservation constraint. Existing feature behavior and routes remain part of the acceptance scope.

## Design plan

Palette: paper white `#ffffff`, canvas `#f4f6fa`, ink navy `#16243b`, secondary ink `#5d6b7e`, line `#dde3ec`, restrained gold `#c99434`. Existing navy/gold branding stays recognizable.

Typography: native Segoe UI Variable/Segoe UI/system sans for navigation and reading; Georgia only for the Justice AI wordmark. No remote font dependency. Left-aligned headings, comfortable body spacing, short explanations.

Layout: persistent desktop navigation for Home, My cases and All tools; secondary citizen/advocate entry points; a compact mobile navigation drawer. Search opens a keyboard-accessible tool finder. Tool pages show one active task at a time. Case details use one workspace with section tabs.

```
brand    | breadcrumb                     Find a tool   Sign in
Home     | title + useful next action
My cases | main task / selected workspace section
All tools| supporting links, grouped by user intent
---------|
Citizen  |
Advocate |
```

Review against brief: avoid a marketing hero with fabricated usage figures, repeated feature grids or all tools in a single long page. The strongest emphasis is the notice-analysis starting point. Case storage is optional for standalone tools. Demo labels explain simulated data at the point of use.

## External reference

The supplied [ChatGPT reference](https://chatgpt.com/s/t_6aa69b7c11b48191846f26dd31f96fe5) returned a sign-in shell without conversation content. No requirements were inferred from it. The attachment's explicit speed requirements are the implementation reference.

## Delivered changes

- Modern responsive navigation, searchable tool directory, focused citizen/advocate views and mobile drawer. All original page routes remain available. Standalone notice analysis, voice/chat and drafting do not require a case.
- Supabase authentication and private, durable case storage, supplied as an additive SQL migration. Case list/detail supports search, filters, editing and archival. Original files and saved work have immutable versions; SHA-256 comparisons describe whether bytes match the uploaded original.
- Explicit sharing of selected versions, verified-account invitations, acceptance, read/comment/edit permissions and revocation. New uploads and versions are not automatically shared. Static directories and demo roles do not establish professional identity or private access.
- Document-derived proposals with source excerpts, reviewed timeline entries, persistent tasks, version-specific draft reviews and server-generated activity history. Optional Save to case actions connect the original tools to the workspace.
- Selected reviewed PDF bundles with page breaks and embedded Latin, Devanagari and Bengali fonts, plus original attachments in ZIP and a browser-print alternative. Exports apply the same item authorization as reading and downloads.
- Real Gemini/NVIDIA fallback, consent, bounded retries/timeouts, streaming, cancellation and retained pending input. Demo responses require explicit selection. Complete document analyses must pass schema validation, including source support for suggested dates.
- OCR repaired after the feature additions: native PDF/text extraction first, scanned-page OCR only when needed, correct multipart encoding, page ordering, explicit failures and scoped extraction caches. Original uploads remain separate from extracted and generated content.

Next.js was updated from 14.2.5 to 15.5.24 while preserving React 18. The old version was affected by a published Windows server vulnerability; 15.5.24 is a patched release. Cookies and route parameters now follow the asynchronous request APIs. PostCSS and nanoid were also updated; the final dependency audit reported zero vulnerabilities. See the [official security advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36).

## Verification and evidence

| Check | Result and limits |
| --- | --- |
| Automated suite | 55 tests passed: 20 case/backend tests, one redirect test, 20 AI/provider tests and 14 OCR tests. |
| Type checking and production build | Passed on Next.js 15.5.24 / React 18.3.1. |
| Routes | All 15 original/new top-level pages returned usable production HTML. Missing backend configuration leaves standalone tools available. Live AI without processor consent returns 428. |
| Browser | Desktop and 390 px mobile layouts checked; navigation, tool search, keyboard dismissal, focused advocate tabs, demo voice/chat/drafting and setup/error screens exercised. No horizontal overflow on the checked mobile pages. |
| Authorization | Actual route handlers tested with a mocked Supabase transport: forged identity and guessed case/item IDs denied; exact version selection, invitation acceptance and revocation enforced. A real multi-account database run remains pending configuration. |
| Document integrity and reviews | Fingerprints change with changed bytes; source excerpts are checked against authorized versions; editing reviewed work creates a new version requiring review. |
| Reviewed exports | Selection and permission checks tested. An eight-page synthetic PDF with long text, Hindi/Marathi and Bengali content was rendered and visually inspected; fonts and page breaks were readable. |
| Existing draft PDF | The production PDF button generated an `application/pdf` Blob of 6,329 bytes with a valid `%PDF-1.3` header. The browser automation transport cancelled both this download and an independent plain-text download control, so saving that browser download to disk remains unverified. |
| AI resilience | Simulated outages, both-provider failure, refusal, cancellation and incomplete streaming checked. A live drafting request also fell back from NVIDIA to Gemini successfully. |
| Live extraction | Digital PDF, scanned PDF, PNG, JPEG and mixed three-page PDF all contained expected synthetic text. Mixed page order was native/OCR/native. |
| Live analysis endpoint | Production digital/scanned PDF requests returned validated Gemini analysis; corrupt PDF returned 422. No deadline was invented for fixtures without one. |
| Dependency audit | `npm audit --audit-level=low`: zero vulnerabilities at verification time. |

The backend suite exercises application contracts with an injected transport; it is not evidence that an unconfigured Supabase project has accepted the migration or persisted data. Provider live checks use only synthetic non-sensitive fixtures and do not print credentials or private document contents.

### Latency measurements

The baseline synthetic JSON chat request returned its first response in 2,828 ms and completed in 2,830 ms. The final local development measurements were: JSON chat first content 3,714 ms / total 3,715 ms; streaming chat first generated content 2,961 ms / total 3,062 ms. Its progress headers arrived in 14 ms. Drafting under a primary-provider failure took 25,865 ms to first generated content and 26,191 ms total, including retries and successful secondary processing.

These single observations do not establish lower total generation latency. Streaming makes progress and generated text visible before completion; timeout bounds, output limits and extraction reuse address avoidable waiting. The production advocate page's reported first-load JavaScript fell from about 231 kB at baseline to 124 kB after keeping PDF generation behind a dynamic import. See [AI measurements](ai-latency-final.json), [live OCR results](ocr-live-results.json) and [production analysis results](analysis-route-results.json).

## Remaining external setup

The supplied public Supabase URL and publishable key are now configured. A live read-only Auth settings check succeeded, with email sign-in and email confirmation enabled. The server-only case-storage secret is still absent. Run the supplied migration and configure `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`) using [the setup guide](case-workspace-setup.md), then run its two-account acceptance checklist for real persistence, invitations, revocation and downloads. The missing storage configuration is shown directly in the app.

No public deployment or service purchase was performed. Linux deployment, provider plan limits and non-English OCR still require verification on the chosen host/account. The local extraction/parser checks and production build passed on Windows. The existing environment file and provider credentials were preserved.

New vault uploads are limited to 3 MB and standalone encoded uploads to 2 MB to fit the configured serverless transport. On Vercel, ZIP selections are limited to 3 MB of originals and final bundles are checked against a 4 MiB response budget; oversized selections return an actionable error. Self-hosted ZIP selections retain a 50 MB original-size limit. See the [Vercel function limits](https://vercel.com/docs/functions/limitations).

Further implementation details: [AI processing](ai-resilience.md), [OCR root cause and repair](ocr-repair.md), [case architecture and setup](case-workspace-setup.md).

## Supabase SSR follow-up (historical; superseded by Clerk below)

Installed `@supabase/supabase-js` and `@supabase/ssr`, added server/browser client
helpers and Next.js 15 middleware, and moved the existing sign-in/out APIs to SDK
cookies. Middleware explicitly validates/refreshes the session and forwards new
cookies to both downstream requests and the browser, with private cache headers.
The email callback handles PKCE codes and allows only local return paths. The
existing homepage is preserved; the sample `todos` query is not an app feature.

Authentication configuration is independent of the elevated key needed for case
storage. Legacy URL/anon and service-role settings remain supported. Modern
secret keys are sent only in server-side `apikey` headers, not as JWT Bearer
tokens. Ordinary case data permissions are unchanged and still enforced in each
API. SSR cookies replace the previous custom HttpOnly pair; see setup notes for
the browser cookie model and reauthentication after migration.

The full suite now has 60 passing tests, including a real SDK sign-in/sign-out
with a mocked transport, forged-cookie identity checks, middleware token refresh
and propagation, public-only auth configuration, and modern secret headers. A
live read-only Auth settings check returned 200; no real account was created and
no verification email was sent during testing. Case persistence remains pending
the server secret and database migration.

The updated production build and type check pass, all 15 page smoke checks pass,
and the sign-in form is enabled with no browser errors. The production session
API reports `authConfigured: true`, `configured: false`; anonymous case requests
return 401 and invalid confirmation callbacks stay on the application origin.
Both optional official Supabase skills were installed into the local Codex skill
directory and become available on the next turn.

## Clerk authentication follow-up (current)

The user selected Clerk for sign-in and Supabase for case storage. Clerk CLI
3.3.0 is authenticated and links the requested app
`app_3JHTLaXuRwyZkxfGKzrrfkyEwiR`. Initialization installed `@clerk/nextjs` 7.9.2;
its incomplete scaffolding was finished manually. `clerk env pull` supplied the
development keys without reading or printing the local environment file.
`clerk doctor` passes authentication, app linkage and environment checks; a
production instance is not configured.

The provider sits inside `<body>`, the navigation has signed-out actions and a
signed-in profile menu, and dedicated catch-all sign-in/up routes use Clerk UI.
The Next.js 15 middleware includes API/TRPC and `/__clerk/:path*` matchers.
Clerk chooses its default instance-specific proxy behavior: forcing proxying
for development caused `host_invalid` and was removed, as described in the
[proxy documentation](https://clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi).
The local production preview binds to `localhost`; binding to `127.0.0.1` while
using localhost caused a self-rewrite proxy error with this SDK/framework pair.

Private APIs now use awaited Clerk auth and the verified primary email. An
additive migration introduces internal account UUIDs and preserves all existing
case actor foreign keys. Email and user-editable metadata cannot assign old
ownership. Administrator-imported accounts can use `externalId` before their
first private-case request. Both new-account and legacy-link races are tested.
The old Supabase callback redirects to Clerk and old cookies have no case access.
The Supabase SSR helpers remain available but no longer drive app authentication.

All 66 automated tests pass with Clerk SDK identities and Supabase transport
mocked in the case tests. Type checking and the production build pass, and the
package audit reports zero vulnerabilities. These checks do not establish live
case persistence: the server-only Supabase secret is absent and neither SQL
migration has been applied from this workspace. No real app account was created
and no user verification email was sent by the tests.

Final Clerk browser checks: the sign-in and sign-up forms render, navigation
opens the appropriate form, and the 390 px mobile and 1280 px desktop layouts
have no horizontal overflow. The sign-in title now uses Justice AI and the
form heading is sized independently of workspace headings. Browser errors were
empty. All 16 route smoke checks pass against the final production build.
The live anonymous session endpoint reports Clerk configured and case storage
not configured; private case access returns 401. The legacy callback rejects
external return destinations. Full sign-up, the signed-in profile menu and
real multi-account persistence remain pending the user's first test account and
Supabase storage setup.

# Justice AI

An Indian legal assistance workspace for citizens and advocates. The app keeps standalone tools available and adds optional private case management.

## Run locally

Use Node.js 22.13 or newer (24 LTS recommended for deployment). Then run:

```sh
npm ci
npm run dev
```

Open [Justice AI](http://localhost:3000). Navigation is organized into Home, My cases and All tools. The citizen and advocate workspaces provide focused views of the existing tools.

Copy `.env.local.example` to `.env.local` only if no environment file exists. Otherwise add missing settings without overwriting existing values. All example credentials are blank. Keep `.env.local` private.

## Configuration

- [Private case setup](docs/case-workspace-setup.md): Clerk authentication, Supabase database migrations, private document storage and verification.
- [AI processing](docs/ai-resilience.md): existing Gemini/NVIDIA keys, actual fallback, consent, streaming and bounded request settings.
- [OCR setup and repair](docs/ocr-repair.md): PDF/text extraction, OCR.space settings, supported formats, limits and live test results.
- [Implementation and acceptance report](docs/IMPLEMENTATION-2026-09.md): baseline, design decisions, changes and verification limits.

Sign-in uses Clerk, with the application linked through the Clerk CLI. Run `clerk env pull --app app_3JHTLaXuRwyZkxfGKzrrfkyEwiR --file .env.local` to obtain development keys without exposing them. Supabase stores cases and private files; it requires the supplied public URL/key, a server-only `SUPABASE_SECRET_KEY` (or legacy service role key), and both database migrations. Missing storage configuration produces setup guidance while sign-in and standalone tools remain available. Real AI requests require processor consent. Demo mode is explicitly selected and never substitutes for a failed live request.

## Features

- Notice analysis with plain-language summaries and unconfirmed source-based dates.
- Text/voice chat, drafting with existing downloads, IPC–BNS mapping, legal aid, lawyer directory, advocate network, precedents, intake and review demos, action tracker and Lok Adalat information.
- Authenticated cases with document originals/versions, SHA-256 comparison, selected collaboration permissions, source-linked chronology, persistent tasks, draft reviews and activity history.
- Selected reviewed PDF bundles with embedded Latin, Devanagari and Bengali fonts, a browser-print option for other scripts, and ZIP original attachments.

Original routes remain available. `/portal` is only a demo preference selector and cannot grant access to private case data. Static directory entries and simulated intake/review results are clearly labeled. Existing AI keys/models are reused; no project credentials are overwritten.

## Verification

```sh
npm test
npm run typecheck
npm run build
# With the app running:
node scripts/smoke.mjs
```

The automated suite tests actual API authorization contracts with mocked Clerk identities and Supabase transport, account mapping and concurrent linking, provider fallback/refusal/cancellation, file validation, source integrity, immutable review versions, exports and deterministic OCR fixtures. Database-backed multi-session behavior needs verification against your configured Supabase project; the repository does not include a fake production database.

Optional live checks use only the supplied synthetic fixtures and configured providers:

```sh
node --import tsx scripts/verify-ocr-live.ts
node scripts/verify-analysis-route.mjs
node scripts/measure-ai.mjs
```

Reports are stored in `docs/`. No service has been purchased and no public deployment has been performed.

---
name: justice-ai-project
description: Complete Justice AI hackathon project - dual-sided Indian Legal AI platform with Next.js, Gemini, Nemotron
metadata:
  type: project
---

# Justice AI — Project Memory

## Overview
Dual-sided Indian Legal AI platform built for hackathon:
- **Citizen Portal**: Upload legal notices → plain-language summary, urgency badge, deadline tracker, AI chatbot
- **Advocate Portal**: IPC↔BNS converter (searchable), Drafting Co-pilot (split-screen AI document generation)

## Tech Stack
- **Framework**: Next.js 14.2.5 (App Router)
- **Styling**: Tailwind CSS (Navy #0f172a, Gold/Amber accents)
- **Icons**: Lucide React
- **AI**: Google GenAI SDK (@google/genai v1) + NVIDIA Nemotron (OpenAI-compatible)
- **PDF**: pdfjs-dist (text extraction), jspdf (document generation)
- **Language**: TypeScript (strict mode)

## Project Structure
```
Justice-AI-v1/
├── .env.local, .env.local.example          # API keys (gitignored)
├── vercel.json                             # Vercel deployment config
├── app/
│   ├── layout.tsx, globals.css, page.tsx   # Landing page
│   ├── citizen/page.tsx                    # Citizen portal (FileUpload + Analysis + ChatWidget)
│   ├── advocate/page.tsx                   # Advocate portal (IpBnsConverter + DraftingCopilot)
│   └── api/
│       ├── chat/route.ts                   # Gemini chat (citizen/advocate personas)
│       ├── analyze-document/route.ts       # Gemini document analysis (w/ PDF extraction)
│       ├── draft-document/route.ts         # Nemotron legal drafting
│       └── health/route.ts                 # Health check endpoint
├── components/                              # 12 reusable components
│   ├── Navbar, Footer, FeatureCard
│   ├── FileUpload, UrgencyBadge, DeadlineTracker, SummaryCard
│   ├── ChatWidget, IpBnsConverter, DraftingCopilot
├── lib/
│   ├── ai.ts                               # Google GenAI + Nemotron clients
│   ├── mock-data.ts                        # Realistic fallback responses
│   └── ipc-bns-data.ts                     # 21 IPC↔BNS mappings
└── types/index.ts                          # Full TS contracts (client↔server)
```

## Security Model
- API keys **only in server-side Route Handlers** (`app/api/**/route.ts`)
- Client components `fetch('/api/...')` — never see keys
- `.env.local` gitignored, `.env.local.example` committed as template

## Fallback Strategy (Hackathon-Safe)
Every API route:
1. Checks for API key → if missing, returns mock immediately
2. Tries real provider → on any error, logs server-side, returns mock
3. Response includes `"source": "gemini" | "nemotron" | "mock"` for debugging
- **Result**: Demo cannot break on stage even if APIs fail/quota exhausted

## Key Fixes Applied
1. **Section 138 NI Act deadline**: 15 days (not 21) — `lib/mock-data.ts:41`
2. **IPC 378 (Theft) → BNS 303 (Theft)** — not BNS 111 (Snatching) — `lib/ipc-bns-data.ts:93-99`
3. **Google GenAI SDK migration** from REST to `@google/genai` v1
4. **Model selection**: `gemini-3.5-flash` (working), tried 2.5-flash (404), 2.0-flash-001 (quota)
5. **PDF text extraction** (2026-08-02): Switched from `pdf-parse` to `pdfjs-dist/legacy/build/pdf.mjs` for Next.js 14 server-side compatibility — real PDF content now analyzed by Gemini
6. **PDF export for drafting** (2026-08-02): Added `jspdf` to DraftingCopilot — generates downloadable formatted legal documents
7. **Memory folder recreated** (2026-08-03): Recreated `memory/` directory with complete project state after accidental deletion

## Working APIs Status
| API | Provider | Model | Status |
|-----|----------|-------|--------|
| `/api/chat` | Gemini | gemini-3.5-flash | ✅ Real AI |
| `/api/analyze-document` | Gemini | gemini-3.5-flash | ✅ Real AI |
| `/api/draft-document` | Nemotron | nemotron-super-49b-v1 | ✅ Real AI |
| `/api/health` | — | — | ✅ Health check |

## Vercel Deployment Ready
- `vercel.json`: 30s timeout, 1GB memory, Mumbai region (bom1)
- Health endpoint for monitoring
- 4 required env vars: `GEMINI_API_KEY`, `GEMINI_MODEL`, `NEMOTRON_API_KEY`, `NEMOTRON_MODEL`

## Commands
```bash
npm run dev      # Development (port 3000/3001)
npm run build    # Production build (passes)
npm run start    # Production server
```

## Current .env.local (working)
```env
GEMINI_API_KEY=MY_API_KEY
GEMINI_MODEL=gemini-3.5-flash
NEMOTRON_API_KEY=MY_API_KEY
NEMOTRON_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1
```

## Known Limitations
- Gemini free-tier quota exhausted → falls back to mock (intentional safety net)
- IPC↔BNS dataset is 21-sample subset (not exhaustive)
- PDF parser: extracts text only (no OCR for scanned/image-based PDFs); DOC/DOCX still use filename fallback
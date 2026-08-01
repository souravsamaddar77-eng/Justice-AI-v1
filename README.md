# Justice AI

> Empowering Citizens, Equipping Advocates — an Indian Legal AI platform.

Dual‑sided legal assistant:
- **Citizens** upload a legal notice → get a plain‑language summary, urgency rating, statutory deadline, and an AI chatbot to ask follow‑ups.
- **Advocates** get an **IPC ↔ BNS (2023) code converter** and a **drafting co‑pilot** that generates bail applications / replies / affidavits.

Built for a hackathon with **Next.js (App Router)**, **Tailwind CSS**, **Lucide Icons**, **Google Gemini**, and **NVIDIA Nemotron**.

---

## 1. Quick start

```bash
# from the project root
npm install        # install dependencies
npm run dev        # start the dev server → http://localhost:3000
```

Open:
- `http://localhost:3000`           → Landing
- `http://localhost:3000/citizen`   → Citizen Portal
- `http://localhost:3000/advocate`  → Advocate Portal

## 2. Add your API keys (optional)

Create `.env.local` (a template is provided at `.env.local.example`):

```bash
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-1.5-flash          # optional
NEMOTRON_API_KEY=your_nvidia_key
NEMOTRON_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1   # optional
```

- Get a **Gemini** key: https://aistudio.google.com/app/apikey
- Get a **Nemotron** (NVIDIA) key: https://build.nvidia.com

> ⚠️ **If the keys are left blank, the app still works** — every API route automatically returns realistic mock data so a live demo never breaks. This is intentional for the hackathon.

## 3. Architecture

```
app/
  layout.tsx              Root layout + Navbar + Footer
  globals.css             Tailwind layers + brand utilities
  page.tsx                Landing (hero + two entry buttons + features)
  citizen/page.tsx        Citizen Portal (upload → analysis → chatbot)
  advocate/page.tsx       Advocate Portal (IPC↔BNS converter + drafting co-pilot)
  api/
    chat/route.ts              Gemini chat (Justice AI assistant)
    analyze-document/route.ts  Gemini document analysis (urgency/deadline/summary)
    draft-document/route.ts    Nemotron legal drafting
components/   Navbar, Footer, FeatureCard, FileUpload, UrgencyBadge,
              DeadlineTracker, SummaryCard, ChatWidget,
              IpBnsConverter, DraftingCopilot
lib/
  mock-data.ts        Realistic fallback responses + date helpers
  ipc-bns-data.ts     Sample IPC (1860) → BNS (2023) mapping dataset
types/index.ts        Shared TypeScript contracts (client ⇄ server)
```

### Security model
- API keys are read **only inside `app/api/**/route.ts`** (Next.js Route Handlers run on the server).
- Client components **never touch a key** — they `fetch('/api/...')`.
- `.env.local` is gitignored.

### Fallback model
Every route handler does:
1. If the key is missing → return mock data immediately.
2. Else call the real provider inside `try/catch`.
3. On any error → log server‑side, return mock data.

Every response includes `"source"` (`"gemini" | "nemotron" | "mock"`) so you can see at a glance which path served the demo.

## 4. Notes & limitations
- The IPC↔BNS dataset is a **demo sample** — verify against the official BNS 2023 before any real‑world use.
- Document upload is a UI + analysis flow; without a PDF parser installed it derives the analysis from the filename/notes. To add real extraction, `npm i pdf-parse` and decode the uploaded file in `analyze-document/route.ts`.
- This is an **educational prototype**, not legal advice.

# Justice AI — Comprehensive Implementation Prompt for New Features

## Project Context
This is a Next.js 14+ (App Router) legal tech application with:
- **Citizen Portal** (`/citizen`) - Document analysis, urgency rating, deadline tracking, chat
- **Advocate Portal** (`/advocate`) - IPC↔BNS converter, AI document drafting (Nemotron), chat
- **Tech Stack**: Next.js, TypeScript, Tailwind CSS, Google GenAI (Gemini), NVIDIA Nemotron API
- **Current API routes**: `/api/analyze-document`, `/api/draft-document`, `/api/chat`, `/api/health`

---

## Feature 1: Citizen Portal — "Legal Aid" Section with College-Based Free Legal Aid

### Requirements
1. Add a new **"Legal Aid"** option/tab in the Citizen Portal (`/citizen/page.tsx`)
2. Display free legal aid provided by **West Bengal colleges/universities** (starting with **Brainware University** only for now)
3. Use **user's GPS location** to show nearest legal aid providers
4. **Brainware University page** should support **2 PDF attachments** (uploaded as static assets)

### Implementation Plan

#### A. Add Legal Aid Data Structure (`lib/legal-aid-data.ts`)
```typescript
export interface LegalAidProvider {
  id: string;
  name: string;
  type: "university" | "college" | "legal-aid-clinic";
  address: string;
  city: string;
  state: "West Bengal";
  coordinates: { lat: number; lng: number };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  services: string[];
  timings: string;
  pdfs?: { title: string; filename: string }[]; // For Brainware University
}

export const legalAidProviders: LegalAidProvider[] = [
  {
    id: "brainware-university",
    name: "Brainware University Legal Aid Clinic",
    type: "university",
    address: "398, Ramkrishnapur, Kolkata - 700124",
    city: "Kolkata",
    state: "West Bengal",
    coordinates: { lat: 22.5726, lng: 88.3639 },
    contact: {
      phone: "+91-33-2580-XXXX",
      email: "legalaid@brainwareuniversity.ac.in",
      website: "https://brainwareuniversity.ac.in/legal-aid"
    },
    services: [
      "Free legal consultation",
      "Drafting of legal notices and applications",
      "Representation in Lok Adalat",
      "Consumer protection guidance",
      "Family law matters",
      "Property dispute mediation"
    ],
    timings: "Mon-Fri: 10:00 AM - 5:00 PM",
    pdfs: [
      { title: "Legal Aid Application Form", filename: "brainware-legal-aid-form.pdf" },
      { title: "Know Your Rights Handbook", filename: "brainware-rights-handbook.pdf" }
    ]
  }
];
```

#### B. Create Legal Aid Component (`components/LegalAid.tsx`)
- GPS location detection using `navigator.geolocation`
- Distance calculation (Haversine formula) to sort by proximity
- Clean card-based UI matching existing design system
- PDF download buttons for Brainware University

#### C. Update `/citizen/page.tsx`
- Add a new section/tab after the analysis dashboard
- Use existing `card-surface` styling
- Include "Legal Aid" in the portal navigation

#### D. PDF Upload Instructions
1. Place PDFs in `/public/legal-aid/brainware/`
2. Name them exactly: `brainware-legal-aid-form.pdf` and `brainware-rights-handbook.pdf`
3. Access via `/legal-aid/brainware/brainware-legal-aid-form.pdf`

---

## Feature 2: Advocate Portal — "Lok Adalat Updates" Section

### Requirements
1. Add a new **"Lok Adalat Updates"** option in the Advocate Portal
2. Fetch data from **https://westbengal.nalsa.gov.in/lok-adalat/**
3. Display updates from **different districts of West Bengal**
4. Match existing design patterns (like IPC↔BNS converter)

### Implementation Plan

#### A. Create Lok Adalat Data Types (`types/lok-adalat.ts`)
```typescript
export interface LokAdalatUpdate {
  id: string;
  district: string;
  date: string;
  title: string;
  description: string;
  casesDisposed: number;
  casesReferred: number;
  nextDate?: string;
  sourceUrl: string;
}

export interface LokAdalatSchedule {
  district: string;
  date: string;
  venue: string;
  time: string;
  benchComposition: string;
}
```

#### B. Create Scraper/API Route (`app/api/lok-adalat/route.ts`)
- **Option 1**: Server-side scrape (if site allows) using cheerio
- **Option 2**: Proxy to NALSA API if available
- **Option 3**: Static data with manual update fallback (safest for demo)

```typescript
// Recommended: Static mock data with structure for real integration
export const mockLokAdalatUpdates: LokAdalatUpdate[] = [
  {
    id: "1",
    district: "Kolkata",
    date: "2026-08-10",
    title: "Monthly Lok Adalat - 1,200 Cases Disposed",
    description: "The Kolkata District Legal Services Authority conducted its monthly Lok Adalat...",
    casesDisposed: 1200,
    casesReferred: 3400,
    sourceUrl: "https://westbengal.nalsa.gov.in/lok-adalat/"
  },
  // Add more districts: North 24 Parganas, South 24 Parganas, Howrah, Hooghly, etc.
];
```

#### C. Create `LokAdalatUpdates` Component (`components/LokAdalatUpdates.tsx`)
- Search/filter by district
- Tabular or card layout similar to `IpBnsConverter`
- "Refresh" button (calls API)
- Link to source website

#### D. Update `/advocate/page.tsx`
- Add new section after Drafting Co-Pilot
- Use same visual hierarchy as existing sections

---

## Feature 3: Fix Nemotron Drafting Error — "Couldn't generate the draft try again"

### Current Status
**The API is working correctly** — test confirms Nemotron returns valid responses. The error likely occurs due to:

### Possible Root Causes
1. **Missing `NEMOTRON_API_KEY`** in production environment (Vercel)
2. **Timeout** - Nemotron API can be slow; default fetch timeout may be too short
3. **Rate limiting** from NVIDIA API
4. **Network issues** between Next.js server and NVIDIA endpoint
5. **Model name mismatch** - verify `NEMOTRON_MODEL` in `.env.local`

### Fixes to Implement

#### A. Add Timeout & Retry Logic (`lib/ai.ts` - `callNemotron` function)
```typescript
export async function callNemotron(
  messages: NemotronMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const apiKey = process.env.NEMOTRON_API_KEY;
  const model = process.env.NEMOTRON_MODEL || "nvidia/llama-3.3-nemotron-super-49b-v1";
  if (!apiKey) throw new Error("NEMOTRON_API_KEY missing");

  const url = "https://integrate.api.nvidia.com/v1/chat/completions";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  const body = {
    model,
    messages,
    temperature: opts.temperature ?? 0.5,
    top_p: 0.9,
    max_tokens: opts.maxTokens ?? 1536,
    stream: false,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const detail = await safeText(res);
      throw new Error(`Nemotron HTTP ${res.status}: ${detail.slice(0, 300)}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("Nemotron returned empty content");
    return text.trim();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Nemotron request timed out after 60 seconds");
    }
    throw err;
  }
}
```

#### B. Improve Error Handling in `/api/draft-document/route.ts`
```typescript
// Add more specific error messages
} catch (err) {
  console.error("[/api/draft-document] Nemotron failed:", err instanceof Error ? err.message : err);
  const errMsg = err instanceof Error ? err.message : "Unknown error";
  if (errMsg.includes("timed out")) {
    // Still fall through to mock - but log specifically
  }
}
```

#### C. Add Explicit `NEMOTRON_API_KEY` Check in Frontend
Add API key validation to show clearer error if missing.

#### D. Environment Variable Check
Verify in `.env.local`:
```
NEMOTRON_API_KEY=nvapi-...your-key...
NEMOTRON_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1
```

---

## Design System Consistency Rules

### Colors (from `tailwind.config.ts` & globals)
- **Primary**: Navy (`navy-900`, `navy-800`, `navy-50`)
- **Accent**: Gold (`gold-500`, `gold-400`, `gold-300`)
- **Card backgrounds**: `card-surface` (white with subtle border)
- **Text**: `navy-900` (headings), `navy-600` (body), `navy-400` (muted)

### Component Patterns to Follow
1. **Section headers**: Same as `IpBnsConverter` and `DraftingCopilot`
   ```tsx
   <div className="mb-4 flex items-center gap-2">
     <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-gold-300">
       <Icon className="h-5 w-5" />
     </span>
     <div>
       <h2 className="font-serif text-2xl font-semibold text-navy-900">Section Title</h2>
       <p className="text-sm text-navy-500">Description</p>
     </div>
   </div>
   ```

2. **Cards**: Use `card-surface` with `rounded-2xl border border-navy-200`

3. **Inputs**: Use `.input` class (defined inline in DraftingCilot) or global

4. **Buttons**: Use `btn-primary` / `btn-secondary` from globals

---

## File Structure Summary

### New Files to Create
```
lib/
├── legal-aid-data.ts          # Legal aid provider data
├── lok-adalat-data.ts         # Lok Adalat mock data + types

components/
├── LegalAid.tsx               # Legal aid finder with GPS
├── LokAdalatUpdates.tsx       # Lok Adalat updates display
├── PdfDownloadButton.tsx      # Reusable PDF download component

app/api/
├── lok-adalat/
│   └── route.ts               # Lok Adalat API endpoint
├── draft-document/
│   └── route.ts               # (modify for timeout fix)

public/legal-aid/brainware/    # PDF placement directory
├── brainware-legal-aid-form.pdf
└── brainware-rights-handbook.pdf

types/
└── lok-adalat.ts              # Lok Adalat type definitions
```

### Files to Modify
```
app/citizen/page.tsx           # Add Legal Aid section
app/advocate/page.tsx          # Add Lok Adalat section  
lib/ai.ts                      # Add timeout to callNemotron
app/api/draft-document/route.ts # Improved error handling
```

---

## Implementation Order
1. **Feature 3 (Nemotron fix)** — Critical for existing functionality
2. **Feature 1 (Legal Aid)** — New component, GPS integration, PDF handling
3. **Feature 2 (Lok Adalat)** — New component, data fetching/scraping

---

## PDF Upload Instructions for Brainware University

1. **Create directory**:
   ```bash
   mkdir -p public/legal-aid/brainware
   ```

2. **Place your 2 PDFs** in that directory with exact names:
   - `brainware-legal-aid-form.pdf`
   - `brainware-rights-handbook.pdf`

3. **Reference in component** via:
   ```tsx
   <a href="/legal-aid/brainware/brainware-legal-aid-form.pdf" target="_blank" rel="noopener">
     Download Legal Aid Form
   </a>
   ```

4. **Commit to git** — these files will be served statically by Next.js

---

## Testing Checklist

- [ ] Nemotron drafting works without timeout errors
- [ ] Legal Aid section appears in Citizen Portal
- [ ] GPS location fetches correctly (HTTPS required for geolocation)
- [ ] Brainware University shows with 2 PDF download links
- [ ] Distance sorting works (nearest first)
- [ ] Lok Adalat section appears in Advocate Portal
- [ ] District filtering works
- [ ] All new components match existing design system
- [ ] No breaking changes to existing features
- [ ] Build passes: `npm run build`
- [ ] Dev server runs: `npm run dev`
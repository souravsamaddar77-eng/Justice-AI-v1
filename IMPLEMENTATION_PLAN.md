# Justice AI — Implementation Plan: Clerk + AWS S3 + Pinecone

**Goal:** Add authentication, cloud storage, and vector RAG without breaking existing functionality.

---

## Phase 0 — Preparation (Day 0, 30 min)

### 0.1 Create feature branch
```bash
cd .antigravity-ide/Justice-AI-v1
git checkout -b feat/auth-storage-rag
git push -u origin feat/auth-storage-rag
```

### 0.2 Snapshot current working state
```bash
# Verify current build passes
npm run build
# Verify dev server starts
npm run dev
```

### 0.3 Document current `.env.local` keys
```bash
cat .env.local  # Save values elsewhere (GEMINI_API_KEY, NEMOTRON_API_KEY)
```

### 0.4 Set up Vercel preview deployment (optional but recommended)
- Connect branch to Vercel for isolated testing

---

## Phase 1 — Clerk Authentication (Day 1, ~2-3 hrs)

### 1.1 Install & configure
```bash
npm install @clerk/nextjs
```

### 1.2 Add environment variables
```env
# .env.local (add to existing)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### 1.3 Create middleware.ts (project root)
```ts
// middleware.ts
import { authMiddleware } from "@clerk/nextjs/server";

export default authMiddleware({
  // Public routes that don't require auth
  publicRoutes: [
    "/",
    "/api/health",
    "/api/chat",        // Keep chat working for now
    "/api/analyze-document",
    "/api/draft-document",
    "/sign-in(.*)",
    "/sign-up(.*)",
  ],
  // Routes that can be accessed while signed out but show user info
  ignoredRoutes: ["/api/webhook/clerk"],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

### 1.4 Update app/layout.tsx
```tsx
// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import { arabic } from "@/components/Navbar"; // existing

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
```

### 1.5 Create sign-in/up pages (App Router)
```bash
mkdir -p app/sign-in/[[...sign-in]] app/sign-up/[[...sign-up]]
```

```tsx
// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />;
}
```

```tsx
// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />;
}
```

### 1.6 Update Navbar with auth UI
```tsx
// components/Navbar.tsx (add to existing)
"use client";

import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
// ... existing imports

// In the nav links section, replace with:
<div className="hidden items-center gap-2 sm:flex">
  <SignInButton mode="modal" className="btn-primary">Sign In</SignInButton>
  <SignUpButton mode="modal" className="btn-secondary">Sign Up</SignUpButton>
  <UserButton afterSignOutUrl="/" />
</div>
```

### 1.7 Protect specific routes (optional, incremental)
```tsx
// app/advocate/layout.tsx or page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default function AdvocateLayout({ children }: { children: React.ReactNode }) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  return <>{children}</>;
}
```

### 1.8 Test checklist
- [ ] Dev server starts (`npm run dev`)
- [ ] Sign in/up modals work
- [ ] User avatar appears after login
- [ ] Protected routes redirect to sign-in
- [ ] Existing API routes still work (publicRoutes config)
- [ ] Build passes (`npm run build`)

### 1.9 Rollback plan
```bash
git checkout main -- middleware.ts app/layout.tsx components/Navbar.tsx
rm -rf app/sign-in app/sign-up
npm uninstall @clerk/nextjs
# Remove Clerk env vars from .env.local
```

---

## Phase 2 — AWS S3 Document Uploads (Day 2, ~2 hrs)

### 2.1 Install dependencies
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2.2 Configure S3 bucket (AWS Console)
1. Create bucket: `justice-ai-docs-{random-suffix}`
2. Region: same as `AWS_REGION` (e.g., `us-east-1`)
3. **CORS Configuration** (critical):
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedOrigins": ["http://localhost:3000", "https://your-vercel-app.vercel.app"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```
4. Block public access: **ON** (keep private)
5. Create IAM user → attach policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
    "Resource": "arn:aws:s3:::justice-ai-docs-*/*"
  }]
}
```

### 2.3 Add environment variables
```env
# .env.local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=justice-ai-docs-xyz123
```

### 2.4 Create upload API route
```ts
// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.AWS_S3_BUCKET!;

export async function POST(req: NextRequest) {
  try {
    const { fileName, contentType } = await req.json();
    
    if (!fileName || !contentType) {
      return NextResponse.json({ error: "fileName and contentType required" }, { status: 400 });
    }

    // Validate file type (adjust as needed)
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "text/plain"];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const key = `uploads/${crypto.randomUUID()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour

    return NextResponse.json({ uploadUrl, key, bucket: BUCKET });
  } catch (error) {
    console.error("[/api/upload] Error:", error);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
```

### 2.5 Create client-side upload helper
```ts
// lib/upload.ts
export async function uploadToS3(file: File): Promise<{ key: string; url: string }> {
  // 1. Get presigned URL
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType: file.type }),
  });
  
  if (!res.ok) throw new Error("Failed to get upload URL");
  const { uploadUrl, key } = await res.json();

  // 2. Upload directly to S3
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  
  if (!uploadRes.ok) throw new Error("S3 upload failed");
  
  // 3. Return permanent URL (or generate signed GET URL if private)
  return { key, url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}` };
}
```

### 2.6 Integrate with document analysis
```tsx
// components/DocumentUploader.tsx (new)
"use client";

import { useState } from "react";
import { uploadToS3 } from "@/lib/upload";

export function DocumentUploader({ onUpload }: { onUpload: (url: string, key: string) => void }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { key, url } = await uploadToS3(file);
      onUpload(url, key);
    } catch (err) {
      alert("Upload failed: " + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <input
      type="file"
      accept=".pdf,.png,.jpg,.txt"
      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      disabled={uploading}
      className="file-input-styles"
    />
  );
}
```

### 2.7 Test checklist
- [ ] CORS configured correctly (test from localhost:3000)
- [ ] `/api/upload` returns presigned URL
- [ ] Direct PUT to S3 succeeds
- [ ] File appears in S3 bucket
- [ ] Build passes

### 2.8 Rollback plan
```bash
git checkout main -- app/api/upload/route.ts lib/upload.ts
npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
# Remove AWS env vars
```

---

## Phase 3 — Pinecone Vector RAG (Day 3, ~3-4 hrs)

### 3.1 Choose embedding model (critical decision)
| Model | Dimensions | Cost | Quality |
|-------|------------|------|---------|
| **Gemini `text-embedding-004`** | 768 | Free tier generous | Good for multilingual |
| **OpenAI `text-embedding-3-small`** | 1536 | $0.02/1M tokens | Excellent |
| **OpenAI `text-embedding-3-large`** | 3072 | $0.13/1M tokens | Best |

**Recommendation:** Gemini (free, 768 dims, works with your existing Gemini setup)

### 3.2 Create Pinecone index
```bash
# Via Pinecone Console or CLI
# Name: justice-ai
# Dimension: 768 (for Gemini) or 1536 (for OpenAI small)
# Metric: cosine
# Cloud: aws / Region: us-east-1 (match your S3)
# Namespace: legal-docs
```

### 3.3 Install dependencies
```bash
npm install @pinecone-database/pinecone
# If using OpenAI embeddings:
# npm install openai
```

### 3.4 Add environment variables
```env
# .env.local
PINECONE_API_KEY=pc_...
PINECONE_INDEX=justice-ai
PINECONE_NAMESPACE=legal-docs
# If using OpenAI:
# OPENAI_API_KEY=sk-...
```

### 3.5 Create RAG library
```ts
// lib/rag.ts
import { Pinecone, RecordMetadata } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pc.index(process.env.PINECONE_INDEX!);
const namespace = index.namespace(process.env.PINECONE_NAMESPACE!);

// Use Gemini for embeddings (768 dims, free)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

export async function getEmbedding(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

export interface DocumentChunk {
  id: string;
  text: string;
  metadata: RecordMetadata;
}

export async function upsertChunks(chunks: DocumentChunk[]) {
  const vectors = await Promise.all(
    chunks.map(async (chunk) => ({
      id: chunk.id,
      values: await getEmbedding(chunk.text),
      metadata: chunk.metadata,
    }))
  );

  await namespace.upsert(vectors);
  return vectors.length;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: RecordMetadata;
}

export async function searchSimilar(query: string, topK = 5): Promise<SearchResult[]> {
  const queryVector = await getEmbedding(query);
  const results = await namespace.query({
    vector: queryVector,
    topK,
    includeMetadata: true,
  });

  return (results.matches || []).map((m) => ({
    id: m.id!,
    score: m.score!,
    metadata: m.metadata as RecordMetadata,
  }));
}

// Helper: chunk text for embeddings
export function chunkText(text: string, maxChunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxChunkSize - overlap) {
    chunks.push(text.slice(i, i + maxChunkSize));
  }
  return chunks;
}
```

### 3.6 Create document ingestion API
```ts
// app/api/ingest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { upsertChunks, chunkText } from "@/lib/rag";

export async function POST(req: NextRequest) {
  try {
    const { text, metadata } = await req.json();
    
    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: "Text too short" }, { status: 400 });
    }

    const chunks = chunkText(text).map((chunkText, i) => ({
      id: `${metadata?.docId || crypto.randomUUID()}-chunk-${i}`,
      text: chunkText,
      metadata: {
        ...metadata,
        chunkIndex: i,
        timestamp: new Date().toISOString(),
      },
    }));

    const count = await upsertChunks(chunks);
    return NextResponse.json({ success: true, chunksIndexed: count });
  } catch (error) {
    console.error("[/api/ingest] Error:", error);
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}
```

### 3.7 Update chat API to use RAG
```ts
// app/api/chat/route.ts (modify existing)
// Add after imports:
import { searchSimilar } from "@/lib/rag";

// In POST handler, before calling Gemini:
let context = "";
if (apiKey) {
  try {
    // Retrieve relevant legal context
    const results = await searchSimilar(message, 3);
    if (results.length > 0) {
      context = "\n\nRelevant legal context:\n" + 
        results.map((r, i) => `${i + 1}. ${r.metadata.text?.slice(0, 500)}`).join("\n");
    }
  } catch (err) {
    console.warn("[/api/chat] RAG search failed, continuing without context:", err);
  }
}

// Modify the prompt sent to Gemini:
const systemPrompt = PERSONA_INSTRUCTIONS[persona] + context;
```

### 3.8 Test checklist
- [ ] Pinecone index created with correct dimension
- [ ] Embedding dimension matches index (test with one upsert)
- [ ] `/api/ingest` indexes documents
- [ ] `/api/chat` returns context-aware responses
- [ ] Fallback works when Pinecone unavailable
- [ ] Build passes

### 3.9 Rollback plan
```bash
git checkout main -- app/api/chat/route.ts
rm lib/rag.ts app/api/ingest/route.ts
npm uninstall @pinecone-database/pinecone
# Remove Pinecone env vars
```

---

## Phase 4 — Integration Testing & Polish (Day 4, ~2 hrs)

### 4.1 End-to-end test scenarios

| Scenario | Test Steps | Expected |
|----------|------------|----------|
| **Unauthenticated user** | Visit `/citizen`, upload doc, chat | Works (public routes), no user context |
| **Authenticated user** | Sign in, visit `/advocate`, upload, chat | Works, user ID available |
| **Document flow** | Upload PDF → appears in S3 → ingest → searchable | S3 key stored, Pinecone indexed |
| **RAG chat** | Ask question about uploaded doc | Answer references doc content |
| **Error handling** | Disable Pinecone/S3 → chat still works | Graceful fallback to mock/Gemini-only |

### 4.2 API route protection (optional)
```ts
// app/api/ingest/route.ts (add auth check)
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... rest of handler
}
```

### 4.3 Add loading/error states to UI
- Upload progress indicator
- RAG search indicator in chat
- Error toasts for failed uploads/searches

### 4.4 Performance baselines
```bash
# Measure and record
npm run build  # Bundle size
# API response times (check Vercel logs)
```

---

## Phase 5 — Production Deployment (Day 5+)

### 5.1 Vercel environment variables
Add all keys in Vercel Dashboard → Settings → Environment Variables:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`
- `PINECONE_API_KEY`, `PINECONE_INDEX`, `PINECONE_NAMESPACE`
- `GEMINI_API_KEY`, `NEMOTRON_API_KEY` (existing)

### 5.2 Update CORS for production
Add your Vercel domain to S3 bucket CORS:
```json
"AllowedOrigins": ["http://localhost:3000", "https://your-app.vercel.app"]
```

### 5.3 Clerk production settings
- Switch to production keys in Clerk dashboard
- Update `NEXT_PUBLIC_CLERK_*` URLs to production domain
- Configure OAuth providers (Google, GitHub) if needed

### 5.4 Monitoring & alerts
- **Vercel:** Function duration, error rate
- **Pinecone:** Query latency, index fullness
- **AWS:** S3 request costs, data transfer
- **Clerk:** Active users, auth success rate

---

## Complete File Inventory

### New Files
```
middleware.ts
app/sign-in/[[...sign-in]]/page.tsx
app/sign-up/[[...sign-up]]/page.tsx
app/api/upload/route.ts
app/api/ingest/route.ts
lib/upload.ts
lib/rag.ts
components/DocumentUploader.tsx
```

### Modified Files
```
app/layout.tsx
components/Navbar.tsx
app/api/chat/route.ts
.env.local (additions)
```

### Package.json Additions
```json
{
  "dependencies": {
    "@clerk/nextjs": "^5.x",
    "@aws-sdk/client-s3": "^3.x",
    "@aws-sdk/s3-request-presigner": "^3.x",
    "@pinecone-database/pinecone": "^3.x"
  }
}
```

---

## Risk Mitigation Summary

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Clerk middleware breaks API routes | Medium | High | Explicit `publicRoutes` config, test each route |
| S3 CORS errors | High | Medium | Configure CORS in AWS Console first, test from localhost |
| Pinecone dimension mismatch | Low | Critical | Verify embedding output dims match index before upsert |
| Env var leakage | Low | Critical | Never commit `.env.local`, use Vercel dashboard for prod |
| Free tier exhaustion | Medium | Medium | Monitor usage, add rate limiting |
| Build failures | Low | Medium | Test build after each phase |

---

## Rollback Strategy (Complete)

```bash
# Nuclear option: revert entire branch
git checkout main
git branch -D feat/auth-storage-rag

# Or selective rollback per phase:
# Phase 1 (Clerk):
git checkout main -- middleware.ts app/layout.tsx components/Navbar.tsx
rm -rf app/sign-in app/sign-up
npm uninstall @clerk/nextjs

# Phase 2 (S3):
git checkout main -- app/api/upload/route.ts lib/upload.ts
npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Phase 3 (Pinecone):
git checkout main -- app/api/chat/route.ts
rm lib/rag.ts app/api/ingest/route.ts
npm uninstall @pinecone-database/pinecone
```

---

## Success Criteria

- [ ] All three features work independently
- [ ] All three features work together
- [ ] Existing functionality unchanged (chat, document analysis, drafting)
- [ ] Build passes on main and feature branch
- [ ] No console errors in browser
- [ ] API response times < 2s (P95)
- [ ] Deployed to Vercel preview successfully
# AI processing and verification

Chat, notice analysis, drafting and draft review use Gemini first, then Groq if Gemini cannot complete the request. Groq is called through its own server-side REST adapter at `https://api.groq.com/openai/v1/chat/completions`; it is not a model name routed through Google. Existing keys and configured models are retained. Both receive text only; document images first pass extraction. The legacy NVIDIA adapter remains available to explicit internal callers, but it is not part of the application's automatic fallback sequence.

Every `generateAI` call appends the shared legal-only policy in `lib/legal-scope.ts` to the provider's system instructions. Off-topic requests receive the standard Justice AI refusal. Legal follow-up questions retain conversation context, and document text is treated as task data rather than instructions. For structured tasks, an `outOfScope` response becomes a terminal HTTP 422 `domain` error with the same refusal message; it cannot trigger provider fallback. These are model instructions and validated refusal handling, not a guarantee against every adversarial prompt.

`POST /api/review-draft` accepts either `text` or `fileBase64` with `filename`, plus an optional `language`. It extracts PDF, PNG, JPEG or UTF-8 TXT uploads (2 MB maximum), reviews up to 50,000 characters, and returns actual source text, a summary, findings and extraction/provider metadata. Existing-clause findings require a unique source quote; the server calculates its offsets and paragraph. Whitespace-only differences from PDF/OCR line wrapping are resolved back to the exact source; altered words or punctuation are rejected. Missing-clause findings have an empty quote and no fabricated location. A missing-clause label with a valid existing quote is treated as an incomplete existing clause (ambiguity). Invalid or ungrounded output may fall back to Groq; failure never returns demonstration findings. The UI shows original wording and proposed replacements separately and can export a text report. Scans use the existing OCR.space configuration. Submission does not save the document to a case or Supabase.

The former processing preference, consent checkbox and live/demo selection have been removed. Submission runs the requested tool directly. The UI retains a short disclosure identifying external AI and OCR processors. `GET /api/ai/config` returns configured processor names and `fallbackConfigured` without exposing credentials. Gemini can still serve requests when Groq is not configured, but outage recovery requires a server-only `GROQ_API_KEY`. A missing key or failed request never produces a simulated successful answer. The standalone tools do not retrieve private case material implicitly; case retrieval and extraction enforce the case APIs' item permissions.

The JSON endpoint response shapes remain available. Chat and drafting accept `stream: true` to return SSE events (`stage`, `delta`, `reset`, `result`, `error`). A final `result` is required before saving. If a provider fails after emitting partial text, a `reset` clears that attempt before replacement tokens arrive. Both chat and drafting pass an `onReset` callback to `readAIResponse`; older clients that omit it stop safely. Failed and successful answers are never concatenated. Stage text stays neutral during fallback. Cancellation aborts the current request and never starts another provider.

Every successful API result carries the actual provider/model, attempt count, fallback flag, time to first generated content, and total generation time for diagnostics. The product displays a consistent AI-generated label. No API keys, prompt text, or upstream error bodies are logged by the adapter. Errors distinguish setup, invalid input, credentials/model configuration, timeout, temporary availability, malformed output, and refusal. Safety refusals, including HTTP, structured and text refusal signals, never cause provider switching.

The shared request engine bounds each attempt and total time, reserves time for a configured secondary provider, retries transient failures at most once, observes reasonable Retry-After values, and temporarily cools down failing provider/model pairs. Circuit state is process-local and contains only expiry timestamps; it is not a database or a distributed quota guarantee. A new deployment instance may need its own first failed attempt before cooling down.

Optional blank environment values and defaults:

| Variable | Default / behavior |
| --- | --- |
| GEMINI_API_KEY | Server-only Gemini credential; never use a NEXT_PUBLIC_ prefix |
| GROQ_API_KEY | Server-only Groq credential required for fallback |
| GEMINI_MODEL | `gemini-2.5-flash` when unset; existing configured model is preserved |
| GROQ_MODEL | `llama-3.3-70b-versatile` when unset |
| AI_FALLBACK_ENABLED | enabled; `false` disables secondary requests |
| GEMINI_FALLBACK_MODEL | existing GEMINI_MODEL |
| GROQ_FALLBACK_MODEL | existing GROQ_MODEL |
| AI_ATTEMPT_TIMEOUT_MS | 12000 (capped at 60000) |
| AI_REQUEST_TIMEOUT_MS | 28000 (capped at 90000) |
| AI_RETRIES | 1 (at most one retry per provider) |
| AI_COOLDOWN_MS | 30000 (capped at 300000; longer provider Retry-After respected) |
| AI_MAX_OUTPUT_TOKENS | 2048 for callers without a task-specific bound |

All four APIs accept an optional `language`: `en`, `hi`, `bn`, `ta`, `te`, `mr`, `gu`, `kn`, `ml` or `pa`. Invalid codes are rejected before contacting a processor. The same language and conversation context are passed to both providers. Notice analysis uses JSON mode plus server validation: property names and urgency enums remain stable, while summaries use the selected language. Supporting excerpts remain exact and untranslated. Dates require a supporting excerpt from the submitted text, remain unconfirmed, and are absent when unknown. No default statutory deadline is invented. The standard off-topic refusal remains in English as specified by the domain policy.

`tests/ai.test.ts`, `tests/ai-adapters.test.ts` and `tests/ai-routes.test.ts` use injected or mocked provider transports to verify different-host fallback, incomplete-stream reset, late-token suppression, failure/refusal, timeout, cancellation, Retry-After/cooldown, configured model preservation, schema validation and language handling through the actual API routes. These transport tests do not assert that a live Groq account is configured. `scripts/measure-ai.mjs` uses fixed non-sensitive prompts and reports latency without printing generated text; prior measurement artifacts predate this update.

Protocol references checked during implementation: [Gemini generateContent and streaming](https://ai.google.dev/api/generate-content), [Gemini supported models](https://ai.google.dev/gemini-api/docs/models), [Groq chat and streaming](https://console.groq.com/docs/text-chat), [Groq JSON mode](https://console.groq.com/docs/structured-outputs), [Groq supported models](https://console.groq.com/docs/models). If an existing GEMINI_MODEL points to the retired Gemini 2.0 models, update that setting to an available model. Restart the server after adding or changing credentials.

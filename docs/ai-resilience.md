# AI processing and verification

Chat and notice analysis keep the configured Gemini model as primary. Drafting keeps the configured NVIDIA/Nemotron model as primary. The existing keys are reused; the implementation never rotates keys. When enabled, fallback calls the other provider over its own REST endpoint. Both adapters receive text only. Document images must first pass extraction.

`GET /api/ai/config` discloses configured processor names without exposing credentials. Live clients must submit explicit consent covering the configured providers. Scan uploads additionally require OCR.space consent. Demo mode is an explicit request option and never substitutes for a failed live request. The standalone tools do not retrieve private case material implicitly; case retrieval and extraction enforce the case APIs' item permissions.

The existing JSON endpoints remain available. Chat and drafting accept `stream: true` to return SSE events (`stage`, `delta`, `result`, `error`). A final `result` is required before the UI treats generation as complete or enables saving. A provider failure after any displayed token ends that generation; there is no retry or provider switch that would concatenate incompatible answers. Cancellation aborts fetch and retains input, previous completed drafts, and incomplete output in the current page.

Every live result carries the actual provider/model, attempt count, fallback flag, time to first generated content, and total generation time. No API keys, prompt text, or upstream error bodies are logged by the AI adapter. Errors distinguish setup, consent, invalid input, credentials/model configuration, timeout, temporary availability, malformed output, and refusal. Safety refusals, including HTTP and structured refusal signals, never cause provider switching.

The shared request engine bounds each attempt and total time, reserves time for a configured secondary provider, retries transient failures at most once, observes reasonable Retry-After values, and temporarily cools down failing provider/model pairs. Circuit state is process-local and contains only expiry timestamps; it is not a database or a distributed quota guarantee. A new deployment instance may need its own first failed attempt before cooling down.

Optional blank environment values and defaults:

| Variable | Default / behavior |
| --- | --- |
| AI_FALLBACK_ENABLED | enabled; `false` disables secondary requests |
| GEMINI_FALLBACK_MODEL | existing GEMINI_MODEL |
| NEMOTRON_FALLBACK_MODEL | existing NEMOTRON_MODEL |
| AI_ATTEMPT_TIMEOUT_MS | 12000 (capped at 60000) |
| AI_REQUEST_TIMEOUT_MS | 28000 (capped at 90000) |
| AI_RETRIES | 1 (at most one retry per provider) |
| AI_COOLDOWN_MS | 30000 (capped at 300000; longer provider Retry-After respected) |
| AI_MAX_OUTPUT_TOKENS | 2048 for callers without a task-specific bound |

Notice analysis validates the complete schema before returning it. Dates require a supporting excerpt from the submitted text, remain unconfirmed, and are absent when unknown. No default statutory deadline is invented. Users must review applicability and accuracy before acting on a generated analysis or draft.

`tests/ai.test.ts` and `tests/ai-adapters.test.ts` use injected or mocked providers to verify fallback, failure, refusal, timeout, cancellation, Retry-After/cooldown, capabilities, validation, configured model preservation, real SSE parsing, and incomplete-stream handling. `scripts/measure-ai.mjs` uses fixed non-sensitive prompts and reports latency without printing generated text. See `ai-latency-final.json`; a single local measurement cannot establish a causal reduction in total generation time.

Protocol references checked during implementation: [Gemini generateContent and streaming](https://ai.google.dev/api/generate-content), [NVIDIA chat completion API](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-super-120b-a12b-infer), [NVIDIA SSE format](https://docs.nvidia.com/nim/large-language-models/2.0.6/day-0/get-started-nemotron-3-ultra.html). Existing configured models are preserved rather than replaced by the model names used in these documentation examples.

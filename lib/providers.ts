export type ProviderId = "gemini" | "nemotron";
export class AIError extends Error {
  constructor(public code: string, message: string, public retryable: boolean, public status = 503, public retryAfterMs?: number) { super(message); this.name = "AIError"; }
}
export interface AIMetadata { provider: ProviderId; model: string; fallback: boolean; attempts: number; firstResponseMs: number; totalMs: number }
export interface AIInput {
  system: string; messages: { role: "user" | "assistant"; content: string }[]; maxTokens?: number; json?: boolean; signal?: AbortSignal;
  validate?: (text: string) => void; onDelta?: (delta: string) => void; onStage?: (stage: string) => void;
}
export interface AIProvider {
  id: ProviderId; model: string; capabilities: ("text" | "stream")[];
  generate: (input: AIInput, signal: AbortSignal, onDelta?: (delta: string) => void) => Promise<string>;
}
export interface RunPolicy { attemptTimeoutMs: number; deadlineMs: number; retries: number; cooldownMs: number }
// Circuit state contains no prompts, outputs, credentials, or private material.
const cooldown = new Map<string, number>();
export function resetProviderCooldowns() { cooldown.clear(); }
const cancelled = () => new AIError("cancelled", "Request cancelled. Your input is retained.", false, 499);
async function attempt<T>(operation: (signal: AbortSignal) => Promise<T>, parent: AbortSignal | undefined, timeout: number): Promise<T> {
  if (parent?.aborted) throw cancelled();
  const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>; let onCancel: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onCancel = () => { controller.abort(); reject(cancelled()); }; parent?.addEventListener("abort", onCancel, { once: true });
    timer = setTimeout(() => { controller.abort(); reject(new AIError("timeout", "The AI request timed out. Please retry.", true, 504)); }, timeout);
  });
  try { return await Promise.race([operation(controller.signal), aborted]); }
  finally { clearTimeout(timer!); parent?.removeEventListener("abort", onCancel); controller.abort(); }
}
export async function runProviders(input: AIInput, providers: AIProvider[], policy: RunPolicy): Promise<{ text: string; metadata: AIMetadata }> {
  if (!input.messages.length || input.messages.some(m => typeof m.content !== "string" || !m.content.trim()) || input.messages.reduce((n, m) => n + m.content.length, 0) > 60_000) throw new AIError("input", "The request is empty or too large. Use a shorter document or conversation.", false, 400);
  if (!providers.length) throw new AIError("setup", "No live AI provider is configured. Choose demo mode or configure a provider.", false, 503);
  const started = Date.now(); const deadline = started + policy.deadlineMs; let attempts = 0;
  let lastError = new AIError("unavailable", "AI providers are cooling down after an outage. Please retry shortly.", true, 503);
  for (let index = 0; index < providers.length; index++) {
    const provider = providers[index]; const circuitKey = `${provider.id}:${provider.model}`;
    if (!provider.capabilities.includes("text") || (input.onDelta && !provider.capabilities.includes("stream"))) continue;
    if ((cooldown.get(circuitKey) || 0) > Date.now()) continue;
    for (let retry = 0; retry <= Math.min(policy.retries, 1); retry++) {
      if (input.signal?.aborted) throw cancelled();
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new AIError("timeout", "The overall AI deadline was reached. Your input is retained; retry shortly.", true, 504);
      let emitted = false; let firstResponseMs = 0; attempts++;
      input.onStage?.(index ? "Trying the approved secondary provider…" : retry ? "Retrying a temporary provider error…" : "Connecting to the AI provider…");
      try {
        const text = await attempt(signal => provider.generate(input, signal, input.onDelta ? delta => {
          if (signal.aborted) return; if (!emitted) firstResponseMs = Date.now() - started; emitted = true; input.onDelta?.(delta);
        } : undefined), input.signal, Math.min(remaining, policy.attemptTimeoutMs, index < providers.length - 1 ? Math.max(1, Math.floor(remaining / 2)) : remaining));
        if (!text.trim() || text.length > 100_000) throw new AIError("malformed", "Provider returned empty or oversized output.", true, 502);
        if (/^(?:i(?:'m| am) sorry[, .]*)?(?:i (?:cannot|can't|am unable to)|sorry[, ]+i (?:cannot|can't))/i.test(text.trim())) throw new AIError("safety", "The provider declined this request. Edit the request before trying again.", false, 422);
        input.validate?.(text); cooldown.delete(circuitKey);
        return { text: text.trim(), metadata: { provider: provider.id, model: provider.model, fallback: index > 0, attempts, firstResponseMs: emitted ? firstResponseMs : Date.now() - started, totalMs: Date.now() - started } };
      } catch (error) {
        const safe = error instanceof AIError ? error : new AIError("network", "The AI provider connection failed. Please retry.", true, 503); lastError = safe;
        if (["safety", "cancelled", "input"].includes(safe.code)) throw safe;
        // Visible partial answers are never combined with another attempt/provider.
        if (emitted) throw new AIError(safe.code, "The response stopped before completion. Partial output is not saved as a complete answer. Retry starts a new answer.", safe.retryable, safe.status);
        if (!safe.retryable) break;
        if (retry === Math.min(policy.retries, 1)) { cooldown.set(circuitKey, Date.now() + Math.max(policy.cooldownMs, safe.retryAfterMs || 0)); break; }
        const delay = safe.retryAfterMs ?? 250;
        if (delay > Math.min(policy.attemptTimeoutMs, deadline - Date.now() - 1)) { cooldown.set(circuitKey, Date.now() + delay); break; }
        await attempt(signal => new Promise<void>((resolve, reject) => { const timer = setTimeout(resolve, delay); signal.addEventListener("abort", () => { clearTimeout(timer); reject(cancelled()); }, { once: true }); }), input.signal, Math.max(1, deadline - Date.now()));
      }
    }
  }
  throw lastError;
}

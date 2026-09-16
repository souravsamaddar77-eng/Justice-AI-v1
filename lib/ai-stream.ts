import { AIError, generateAI, type AIInput, type ProviderId } from "./ai";

/** Opt-in SSE; default endpoints still return their existing JSON result shape. */
export function aiStreamResponse(input: AIInput & { primary: ProviderId }, result: (text: string, source: ProviderId, metadata: unknown) => unknown) {
  const controller = new AbortController();
  const onAbort = () => controller.abort(); input.signal?.addEventListener("abort", onAbort, { once: true });
  if (input.signal?.aborted) controller.abort();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(output) {
      const send = (type: string, data: unknown) => { if (!controller.signal.aborted) output.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)); };
      try {
        send("stage", { message: "Preparing your request…" });
        const generated = await generateAI({ ...input, signal: controller.signal, onDelta: text => send("delta", { text }), onStage: message => send("stage", { message }), onReset: () => send("reset", {}) });
        send("result", result(generated.text, generated.metadata.provider, generated.metadata));
      } catch (error) {
        const safe = error instanceof AIError ? error : new AIError("unavailable", "The AI request failed. Retry using your retained input.", true);
        send("error", { error: safe.message, code: safe.code, retryable: safe.retryable });
      } finally { input.signal?.removeEventListener("abort", onAbort); try { output.close(); } catch {} }
    },
    cancel() { controller.abort(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
}

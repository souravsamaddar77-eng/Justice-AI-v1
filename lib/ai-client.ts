/** Read opt-in SSE without treating truncated or failed streams as successful. */
export async function readAIResponse<T>(response: Response, onDelta: (text: string) => void, onStage: (stage: string) => void): Promise<T> {
  if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.error || `Request failed (${response.status}).`); }
  if (!response.headers.get("content-type")?.includes("text/event-stream")) return response.json() as Promise<T>;
  if (!response.body) throw new Error("The response was empty. Please retry.");
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let result: T | undefined;
  try {
    while (true) {
      const { done, value } = await reader.read(); buffer += decoder.decode(value, { stream: !done });
      const events = buffer.split(/\r?\n\r?\n/); buffer = events.pop() || "";
      for (const event of events) {
        const lines = event.split(/\r?\n/); const type = lines.find(l => l.startsWith("event:"))?.slice(6).trim();
        const raw = lines.filter(l => l.startsWith("data:")).map(l => l.slice(5).trim()).join("\n"); if (!raw) continue;
        const payload = JSON.parse(raw);
        if (type === "error") throw new Error(payload.error || "Generation stopped. Please retry.");
        if (type === "delta" && typeof payload.text === "string") onDelta(payload.text);
        if (type === "stage" && typeof payload.message === "string") onStage(payload.message);
        if (type === "result") result = payload as T;
      }
      if (done) break;
    }
    if (!result) throw new Error("The response stopped before completion. Your input and partial output are retained.");
    return result;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

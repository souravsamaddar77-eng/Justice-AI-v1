"use client";
import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Bot, Loader2, Square } from "lucide-react";
import type { ChatMessage, ChatResponseBody } from "@/types";
import AIConsent, { useAIConsent } from "./AIConsent";
import SaveToCase from "./SaveToCase";
import { readAIResponse } from "@/lib/ai-client";

const SUGGESTIONS = ["What does this notice mean?", "How should I prepare a reply?", "Explain a legal term"];
interface DisplayMessage extends ChatMessage { result?: ChatResponseBody }
export default function ChatWidget({ persona = "citizen" }: { persona?: "citizen" | "advocate" }) {
  const [open, setOpen] = useState(false); const [input, setInput] = useState(""); const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([{ role: "assistant", content: "Hello. I can help explain a notice, plan your next steps, or clarify legal terms. What would you like help with?" }]);
  const [partial, setPartial] = useState(""); const [stage, setStage] = useState(""); const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null); const scrollRef = useRef<HTMLDivElement>(null); const inputRef = useRef<HTMLInputElement>(null);
  const ai = useAIConsent();
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, open, partial]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => () => request.current?.abort(), []);
  async function send(text: string) {
    const content = text.trim(); if (!content || request.current || !ai.ready) return;
    const controller = new AbortController(); request.current = controller; setBusy(true); setError(""); setPartial(""); setStage("Preparing your request…");
    // Keep pending input visible until a complete response is received.
    setInput(content);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ message: content, history: messages.slice(1).map(({role,content}) => ({role,content})), persona, ...ai.requestOptions, stream: true }) });
      const data = await readAIResponse<ChatResponseBody>(res, delta => setPartial(prev => prev + delta), setStage);
      setMessages(prev => [...prev, { role: "user", content }, { role: "assistant", content: data.reply, result: data }]);
      setInput(""); setPartial("");
    } catch (error) { setError(controller.signal.aborted ? "Cancelled. Your question and any partial output are retained." : error instanceof Error ? error.message : "The assistant could not complete this request. Please retry."); }
    finally { request.current = null; setBusy(false); }
  }
  return <>
    <button onClick={() => setOpen(true)} className={`fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 text-gold-300 shadow-lg transition hover:bg-navy-800 ${open ? "hidden" : ""}`} aria-label="Open Justice AI chat"><MessageSquare className="h-6 w-6" /></button>
    {open && <section aria-label="Justice AI assistant" onKeyDown={e => { if (e.key === "Escape") setOpen(false); }} className="fixed bottom-3 right-3 z-40 flex h-[min(85vh,42rem)] w-[min(calc(100vw-1.5rem),25rem)] flex-col overflow-hidden rounded-2xl border border-navy-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between bg-navy-900 px-4 py-3 text-white"><div className="flex items-center gap-3"><Bot className="h-5 w-5 text-gold-300" /><div><p className="text-sm font-semibold">Justice AI Assistant</p><p className="text-xs text-navy-300">Ask, understand, take your next step</p></div></div><button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close chat"><X className="h-4 w-4" /></button></div>
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-navy-50/40 p-4" role="log" aria-live="polite">
        {messages.map((m, index) => <div key={index} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}><div className={`max-w-[94%] whitespace-pre-wrap rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-navy-900 text-white" : "border border-navy-200 bg-white text-navy-800"}`}>{m.content}</div>{m.result && <div className="mt-1.5 space-y-1"><p className="text-[10px] text-navy-500">{m.result.source === "mock" ? "Demo · simulated response" : `${m.result.metadata?.provider === "nemotron" ? "NVIDIA" : "Gemini"} · ${m.result.metadata?.model || "AI"}`}</p>{m.result.source !== "mock" && <SaveToCase kind="chat" title="Saved legal conversation" content={messages.slice(0, index + 1).map(item => `${item.role}: ${item.content}`).join("\n\n")} metadata={{ source: m.result.source, ai: m.result.metadata }} />}</div>}</div>)}
        {partial && <div className="rounded-xl border border-gold-200 bg-gold-50 p-3"><p className="mb-1 text-[10px] font-semibold uppercase text-gold-800">{busy ? "Receiving response" : "Incomplete · not saved"}</p><p className="whitespace-pre-wrap text-sm leading-relaxed text-navy-800">{partial}</p></div>}
        {busy && <p className="flex items-center gap-2 text-xs text-navy-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />{stage}</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      </div>
      {messages.length === 1 && <div className="flex flex-wrap gap-1.5 border-t border-navy-100 px-3 py-2">{SUGGESTIONS.map(s => <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }} className="rounded-full bg-navy-100 px-2.5 py-1 text-xs text-navy-600 hover:bg-gold-100">{s}</button>)}</div>}
      <div className="border-t border-navy-100 p-3"><AIConsent value={ai} /></div>
      <form onSubmit={e => { e.preventDefault(); void send(input); }} className="flex items-center gap-2 border-t border-navy-200 p-3">
        <input ref={inputRef} aria-label="Your question" value={input} onChange={e => setInput(e.target.value)} disabled={busy} maxLength={8000} placeholder="Ask about your notice…" className="min-w-0 flex-1 rounded-xl border border-navy-200 px-3 py-2 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200" />
        {busy ? <button type="button" onClick={() => request.current?.abort()} className="rounded-xl bg-red-50 p-2.5 text-red-700" aria-label="Cancel response"><Square className="h-4 w-4" /></button> : <button type="submit" disabled={!input.trim() || !ai.ready} className="rounded-xl bg-gold-500 p-2.5 text-navy-950 disabled:opacity-40" aria-label="Send"><Send className="h-4 w-4" /></button>}
      </form>
    </section>}
  </>;
}

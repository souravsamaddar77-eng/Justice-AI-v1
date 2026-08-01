"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";
import type { ChatMessage } from "@/types";

const SUGGESTIONS = [
  "What happens if I ignore this notice?",
  "How do I respond before the deadline?",
  "Explain the legal term in simple words",
];

export default function ChatWidget({ persona = "citizen" }: { persona?: "citizen" | "advocate" }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // Greeting only once.
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "Hi! I'm the Justice AI assistant. Ask me anything about your legal notice — for example, \"What happens if I ignore this notice?\"",
        },
      ]);
    }
  }, [messages.length]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const userMsg: ChatMessage = { role: "user", content };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history: messages, persona }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't reach the assistant right now. Please try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gold-500 text-navy-950 shadow-lg transition-all hover:bg-gold-400 ${
          open ? "hidden" : "flex"
        }`}
        aria-label="Open Justice AI chat"
      >
        <MessageSquare className="h-6 w-6" />
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-300 opacity-60" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        </span>
      </button>

      {/* Chat panel */}
      <div
        className={`fixed bottom-6 right-6 z-40 flex w-[min(92vw,22rem)] flex-col overflow-hidden rounded-2xl border border-navy-200 bg-white shadow-2xl transition-all ${
          open ? "flex h-[min(70vh,34rem)]" : "hidden"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-navy-900 px-4 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500/20">
              <Bot className="h-4 w-4 text-gold-300" />
            </span>
            <div>
              <p className="text-sm font-semibold">Justice AI Assistant</p>
              <p className="flex items-center gap-1 text-[11px] text-navy-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online · powered by Gemini
              </p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Close chat">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-navy-50/40 p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}>
              <div
                className={`flex max-w-[85%] gap-2 rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-gold-500 text-navy-950"
                    : "bg-white text-navy-800 ring-1 ring-navy-200"
                }`}
              >
                {m.role === "assistant" && <Bot className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />}
                {m.role === "user" && <User className="mt-0.5 h-4 w-4 shrink-0 text-navy-800" />}
                <span className="whitespace-pre-wrap leading-relaxed">{m.content}</span>
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-navy-400 ring-1 ring-navy-200">
                <Loader2 className="h-4 w-4 animate-spin" /> typing…
              </div>
            </div>
          )}
        </div>

        {/* Suggestions (only before first user question) */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-1.5 border-t border-navy-100 bg-white px-3 py-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full bg-navy-100 px-2.5 py-1 text-xs text-navy-600 transition-colors hover:bg-gold-100 hover:text-gold-800"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2 border-t border-navy-200 bg-white p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your notice…"
            className="flex-1 rounded-xl border border-navy-200 px-3 py-2 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500 text-navy-950 transition-colors hover:bg-gold-400 disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  );
}

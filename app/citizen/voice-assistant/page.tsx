"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import type { ChatMessage } from "@/types";

const SUGGESTIONS = [
  "What happens if I ignore this notice?",
  "How do I respond before the deadline?",
  "Explain the legal term in simple words",
];

export default function VoiceAssistantPage() {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [recognition, setRecognition] = useState<any | null>(null);
  const [synthesis, setSynthesis] = useState<any | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voicesLoaded = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // Initialize Web Speech API
  useEffect(() => {
    // Check for SpeechRecognition support
    const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionConstructor) {
      const recog = new SpeechRecognitionConstructor();
      recog.continuous = false;
      recog.interimResults = true;
      recog.lang = "en-IN";
      recog.maxAlternatives = 1;

      recog.onstart = () => setIsListening(true);
      recog.onend = () => setIsListening(false);
      recog.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };
      recog.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setInput(transcript);
        if (event.results[0].isFinal) {
          // Auto-send on final result
          setTimeout(() => send(transcript), 500);
        }
      };

      setRecognition(recog);
      setSpeechSupported(true);
    }

    // Check for SpeechSynthesis support
    if ("speechSynthesis" in window) {
      setSynthesis(window.speechSynthesis);
      setTtsSupported(true);
    }
  }, []);

  // Load voices
  useEffect(() => {
    if (synthesis && !voicesLoaded.current) {
      const loadVoices = () => {
        const voices = synthesis.getVoices();
        if (voices.length > 0) {
          voicesLoaded.current = true;
        }
      };
      loadVoices();
      synthesis.onvoiceschanged = loadVoices;
    }
  }, [synthesis]);

  // Greeting only once
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = "Hello! I'm your Justice AI voice assistant. You can speak to me or type your questions. How can I help you with your legal notice today?";
      setMessages([{ role: "assistant", content: greeting }]);
      speak(greeting);
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
        body: JSON.stringify({ message: content, history: messages, persona: "citizen" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.reply;
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      speak(reply);
    } catch {
      const errorMsg = "Sorry, I couldn't reach the assistant right now. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: errorMsg }]);
      speak(errorMsg);
    } finally {
      setBusy(false);
    }
  }

  function speak(text: string) {
    if (!synthesis || !ttsSupported) return;

    // Cancel any ongoing speech
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to find a good Indian English voice
    const voices = synthesis.getVoices();
    const preferredVoice = voices.find((v: any) => v.lang.includes("en-IN") || v.lang.includes("en-GB")) ||
                           voices.find((v: any) => v.name.includes("Google") && v.lang.includes("en")) ||
                           voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthesis.speak(utterance);
  }

  function stopSpeaking() {
    if (synthesis) {
      synthesis.cancel();
      setIsSpeaking(false);
    }
  }

  function startListening() {
    if (recognition && !isListening) {
      try {
        recognition.start();
      } catch (e) {
        console.error("Recognition start error:", e);
      }
    }
  }

  function stopListening() {
    if (recognition && isListening) {
      recognition.stop();
    }
  }

  function toggleListening() {
    if (isListening) stopListening();
    else startListening();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="bg-navy-50/40 min-h-screen">
      {/* Header */}
      <section className="border-b border-navy-200/70 bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <span className="eyebrow text-gold-400">Citizen Portal</span>
          <h1 className="mt-2 flex items-center gap-3 font-serif text-3xl font-bold sm:text-4xl">
            <Mic className="h-9 w-9 text-gold-300" />
            Voice-Enabled Legal Assistant
          </h1>
          <p className="mt-2 max-w-2xl text-navy-300">
            Speak naturally to get legal guidance. Justice AI listens, understands, and speaks back —
            powered by Web Speech API with Indian English support.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Features overview */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="card-surface p-5 text-center">
            <Mic className="mx-auto h-8 w-8 text-gold-500 mb-2" />
            <h3 className="font-semibold text-navy-900">Speech to Text</h3>
            <p className="mt-1 text-sm text-navy-600">Speak your questions in Hindi, English, or Hinglish</p>
          </div>
          <div className="card-surface p-5 text-center">
            <Volume2 className="mx-auto h-8 w-8 text-gold-500 mb-2" />
            <h3 className="font-semibold text-navy-900">Text to Speech</h3>
            <p className="mt-1 text-sm text-navy-600">Hear responses in natural Indian English voice</p>
          </div>
          <div className="card-surface p-5 text-center">
            <Bot className="mx-auto h-8 w-8 text-gold-500 mb-2" />
            <h3 className="font-semibold text-navy-900">Legal Expertise</h3>
            <p className="mt-1 text-sm text-navy-600">Powered by Justice AI with citizen persona</p>
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex flex-col h-[70vh] min-h-[400px] max-h-[600px] rounded-2xl border border-navy-200 bg-white shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between bg-navy-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500/20">
                <Bot className="h-4 w-4 text-gold-300" />
              </span>
              <div>
                <p className="text-sm font-semibold">Justice AI Voice Assistant</p>
                <p className="flex items-center gap-1 text-[11px] text-navy-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online · Gemini powered
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {speechSupported ? (
                <button
                  onClick={toggleListening}
                  disabled={busy || isSpeaking}
                  className={`rounded-lg p-1.5 transition-colors ${
                    isListening
                      ? "bg-gold-500/20 text-gold-300"
                      : "hover:bg-white/10 text-navy-300"
                  }`}
                  aria-label={isListening ? "Stop listening" : "Start listening"}
                >
                  {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </button>
              ) : (
                <span className="rounded-lg p-1.5 text-navy-400 hover:bg-white/10" title="Speech recognition not supported">
                  <MicOff className="h-4 w-4" />
                </span>
              )}
              <button
                onClick={() => stopSpeaking()}
                className={`rounded-lg p-1.5 transition-colors ${
                  isSpeaking ? "bg-gold-500/20 text-gold-300" : "hover:bg-white/10 text-navy-300"
                }`}
                aria-label={isSpeaking ? "Stop speaking" : "Muted"}
              >
                {isSpeaking ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Status indicator */}
          {(isListening || isSpeaking) && (
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gold-50 border-b border-navy-100 text-sm text-navy-700">
              {isListening && (
                <span className="flex items-center gap-1.5 text-gold-600 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-gold-500" />
                  Listening... speak now
                </span>
              )}
              {isSpeaking && !isListening && (
                <span className="flex items-center gap-1.5 text-gold-600">
                  <span className="h-4 w-4 animate-ping rounded-full bg-gold-400 opacity-60" />
                  <span className="relative h-4 w-4 rounded-full bg-gold-500 ring-2 ring-white" />
                  Speaking...
                </span>
              )}
            </div>
          )}

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
                  disabled={busy}
                  className="rounded-full bg-navy-100 px-2.5 py-1 text-xs text-navy-600 transition-colors hover:bg-gold-100 hover:text-gold-800 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-navy-200 bg-white p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening..." : "Type or tap 🎤 to speak…"}
              className="flex-1 rounded-xl border border-navy-200 px-3 py-2 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
              disabled={isListening}
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

        {/* Info card */}
        <div className="mt-6 rounded-xl border border-navy-200 bg-white p-6 text-sm text-navy-600">
          <h3 className="font-semibold text-navy-900 mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-gold-500" /> Voice Assistant Tips
          </h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>Click the <Mic className="inline h-4 w-4 text-gold-500" /> button and speak clearly in English or Hindi</li>
            <li>Works best in Chrome, Edge, or Safari with microphone permission</li>
            <li>Responses are spoken back automatically — tap <VolumeX className="inline h-4 w-4 text-gold-500" /> to mute</li>
            <li>Your voice data is processed locally in the browser — nothing is recorded or stored</li>
            <li>For complex legal terms, try: "Explain <span className="font-medium">caveat</span> in simple words"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
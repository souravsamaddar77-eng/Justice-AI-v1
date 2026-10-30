"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { usePreferences } from "@/components/PreferencesProvider";
import { LANGUAGES, type Language } from "@/lib/i18n";
import { chatCopy } from "@/lib/chat-copy";
import { VoiceReplyGate, type PromptOrigin } from "@/lib/chat-voice";
import { createBrowserSpeechPlayer, type ChatSpeechPlayer } from "@/lib/chat-speech";
import { readAIResponse } from "@/lib/ai-client";
import { toPlainText } from "@/lib/plain-text";
import type { ChatMessage, ChatResponseBody, SpeechRecognition } from "@/types";

export interface ConversationMessage extends ChatMessage { language: Language; result?: ChatResponseBody }

function useChatSessionState(userId: string | null | undefined, isLoaded: boolean) {
  const { language } = usePreferences();
  const pathname = usePathname();
  const copy = chatCopy(language);
  const [input, setInput] = useState("");
  const [origin, setOrigin] = useState<PromptOrigin>("typed");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [partial, setPartial] = useState("");
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const request = useRef<AbortController | null>(null);
  const recognition = useRef<SpeechRecognition | null>(null);
  const acceptingTranscript = useRef(false);
  const account = useRef<string | null | undefined>(undefined);
  const speechPlayer = useRef<ChatSpeechPlayer | null>(null);
  const gate = useRef(new VoiceReplyGate());
  const languageRef = useRef(language);
  languageRef.current = language;

  const stopReading = useCallback(() => {
    gate.current.invalidate();
    speechPlayer.current?.stop();
    setSpeaking(false);
  }, []);

  const stopVoice = useCallback(() => {
    stopReading();
    acceptingTranscript.current = false;
    recognition.current?.abort();
    setListening(false);
    setOrigin("typed");
  }, [stopReading]);

  useEffect(() => {
    const player = createBrowserSpeechPlayer(setSpeaking, () => setError(chatCopy(languageRef.current).ttsError));
    speechPlayer.current = player;
    setTtsSupported(typeof Audio !== "undefined");
    return () => { player.stop(); speechPlayer.current = null; };
  }, []);

  useEffect(() => {
    const browser = window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition };
    const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    setSpeechSupported(Boolean(Constructor));
    if (!Constructor) return;
    const engine = new Constructor();
    engine.lang = LANGUAGES.find(item => item.code === language)!.speechCode;
    engine.continuous = false;
    engine.interimResults = true;
    recognition.current = engine;
    engine.onstart = () => { if (recognition.current === engine) setListening(true); };
    engine.onend = () => { if (recognition.current === engine) { acceptingTranscript.current = false; setListening(false); } };
    engine.onresult = event => {
      if (recognition.current !== engine || !acceptingTranscript.current) return;
      const transcript = Array.from({ length: event.results.length }, (_, i) => event.results[i][0].transcript).join(" ");
      if (transcript.trim()) {
        gate.current.draftChanged("voice");
        setOrigin("voice");
        setInput(transcript.slice(0, 8000));
      }
    };
    engine.onerror = event => {
      if (recognition.current !== engine) return;
      acceptingTranscript.current = false;
      setListening(false);
      if (event.error !== "aborted") setError(chatCopy(language).micError);
    };
    return () => {
      acceptingTranscript.current = false;
      recognition.current = null;
      engine.onresult = null;
      engine.onerror = null;
      engine.onstart = null;
      engine.onend = null;
      engine.abort();
    };
  }, [language]);

  // Changing language or leaving the visible conversation must never start stale speech.
  useEffect(() => { stopVoice(); }, [language, pathname, stopVoice]);
  useEffect(() => () => {
    gate.current.invalidate();
    request.current?.abort();
    request.current = null;
    speechPlayer.current?.stop();
  }, []);

  function editInput(value: string) {
    acceptingTranscript.current = false;
    gate.current.draftChanged("typed");
    setOrigin("typed");
    setInput(value);
  }

  function speak(text: string, responseLanguage: Language = language) {
    if (!speechPlayer.current) {
      setError(chatCopy(languageRef.current).ttsError);
      return;
    }
    setError("");
    void speechPlayer.current.play(text, responseLanguage);
  }

  async function send() {
    const content = input.trim();
    if (!content || request.current || listening) return;
    const responseLanguage = language;
    const ticket = gate.current.begin(responseLanguage);
    const controller = new AbortController();
    request.current = controller;
    // Silence a previous reply without changing this prompt's voice-origin ticket.
    speechPlayer.current?.stop();
    setSpeaking(false);
    setBusy(true);
    setError("");
    setPartial("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ message: content, history: messages.slice(-12).map(({ role, content }) => ({ role, content })), persona: pathname.startsWith("/advocate") ? "advocate" : "citizen", language: responseLanguage, stream: true }),
      });
      const result = await readAIResponse<ChatResponseBody>(response,
        delta => { if (request.current === controller && !controller.signal.aborted) setPartial(value => value + delta); },
        () => {},
        () => { if (request.current === controller && !controller.signal.aborted) setPartial(""); });
      if (request.current !== controller || controller.signal.aborted) return;
      const reply = toPlainText(result.reply);
      if (!reply) throw new Error(copy.failed);
      setMessages(previous => [...previous, { role: "user", content, language: responseLanguage }, { role: "assistant", content: reply, language: responseLanguage, result }]);
      setInput("");
      setPartial("");
      setOrigin("typed");
      if (gate.current.shouldRead(ticket, languageRef.current, controller.signal.aborted)) speak(reply, responseLanguage);
      gate.current.invalidate();
    } catch (failure) {
      if (request.current === controller) setError(controller.signal.aborted ? chatCopy(languageRef.current).cancelled : failure instanceof Error ? failure.message : chatCopy(languageRef.current).failed);
    } finally {
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  }

  function toggleMicrophone() {
    if (!recognition.current || busy) return;
    if (listening) { recognition.current.stop(); return; }
    stopReading();
    setError("");
    acceptingTranscript.current = true;
    setListening(true);
    try { recognition.current.start(); } catch { acceptingTranscript.current = false; setListening(false); setError(copy.micError); }
  }

  function cancel() {
    gate.current.invalidate();
    request.current?.abort();
    stopReading();
  }

  function clear() {
    cancel();
    request.current = null;
    acceptingTranscript.current = false;
    recognition.current?.abort();
    setListening(false);
    setBusy(false);
    setInput("");
    setOrigin("typed");
    setMessages([]);
    setPartial("");
    setError("");
  }

  useEffect(() => {
    if (!isLoaded) return;
    const nextAccount = userId || null;
    if (account.current !== undefined && account.current !== nextAccount) clear();
    account.current = nextAccount;
    // Account boundaries clear private messages, in-flight responses and speech together.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId]);

  return { input, origin, messages, busy, partial, error, listening, speaking, speechSupported, ttsSupported, editInput, send, speak, stopReading, stopVoice, toggleMicrophone, cancel, clear };
}

const ChatSessionContext = createContext<ReturnType<typeof useChatSessionState> | null>(null);
function SessionProvider({ children, userId, isLoaded }: { children: ReactNode; userId: string | null | undefined; isLoaded: boolean }) {
  const session = useChatSessionState(userId, isLoaded);
  return <ChatSessionContext.Provider value={session}>{children}</ChatSessionContext.Provider>;
}

function ClerkChatSessionProvider({ children }: { children: ReactNode }) {
  const { userId, isLoaded } = useAuth();
  return <SessionProvider userId={userId} isLoaded={isLoaded}>{children}</SessionProvider>;
}

export function ChatSessionProvider({ children, authAvailable }: { children: ReactNode; authAvailable: boolean }) {
  return authAvailable
    ? <ClerkChatSessionProvider>{children}</ClerkChatSessionProvider>
    : <SessionProvider userId={null} isLoaded>{children}</SessionProvider>;
}

export function useChatSession() {
  const session = useContext(ChatSessionContext);
  if (!session) throw new Error("Chat must be inside ChatSessionProvider.");
  return session;
}

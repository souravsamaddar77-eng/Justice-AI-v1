"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { Bot, Loader2, Mic, MicOff, Send, Square, Trash2, Volume2, VolumeX } from "lucide-react";
import SaveToCase from "@/components/SaveToCase";
import { usePreferences } from "@/components/PreferencesProvider";
import { LANGUAGES, type Language } from "@/lib/i18n";
import { chatCopy, chatSuggestions } from "@/lib/chat-copy";
import { toPlainText } from "@/lib/plain-text";
import { useChatSession } from "./ChatSessionProvider";
import "./chat.css";

export default function ChatExperience({ compact = false, active = true }: { compact?: boolean; active?: boolean }) {
  const { language, setLanguage } = usePreferences();
  const pathname = usePathname();
  const chat = useChatSession();
  const copy = chatCopy(language);
  const id = useId();
  const scroll = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [suggestionPage, setSuggestionPage] = useState(0);
  const suggestions = chatSuggestions(language, pathname, chat.messages.filter(message => message.role === "user").map(message => message.content));
  const pageSize = compact ? 3 : 4;
  const suggestionPages = Math.max(1, Math.ceil(suggestions.length / pageSize));
  const visibleSuggestions = suggestions.slice((suggestionPage % suggestionPages) * pageSize, (suggestionPage % suggestionPages + 1) * pageSize);
  useEffect(() => { setSuggestionPage(0); }, [language, pathname, chat.messages.length]);
  useEffect(() => { if (active) input.current?.focus(); }, [active]);
  useEffect(() => { scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "auto" }); }, [chat.messages, chat.partial, active]);

  return <div className={`justice-chat ${compact ? "justice-chat--compact" : "justice-chat--full"}`}>
    <div className="justice-chat-toolbar">
      <label htmlFor={`${id}-language`}>{copy.language}
        <select id={`${id}-language`} value={language} onChange={event => setLanguage(event.target.value as Language)}>
          {LANGUAGES.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
      </label>
      <button type="button" className="justice-chat-icon" title={copy.clear} aria-label={copy.clear} onClick={chat.clear} disabled={!chat.messages.length && !chat.input && !chat.partial}><Trash2 size={17} /></button>
    </div>

    <div ref={scroll} className="justice-chat-messages" role="log" aria-live={active ? "polite" : "off"} aria-relevant="additions text" aria-label={copy.title}>
      {!chat.messages.length && !chat.partial && <div className="justice-chat-welcome"><span><Bot size={25} /></span><p>{copy.greeting}</p></div>}
      {chat.messages.map((message, index) => <div key={index} lang={message.language} className={`justice-chat-message justice-chat-message--${message.role} motion-item`} style={{ "--motion-index": Math.min(index, 5) } as CSSProperties}>
        <div>{message.content}</div>
        {message.role === "assistant" && chat.ttsSupported && <button type="button" className="justice-chat-read" onClick={() => chat.speak(message.content, message.language)} aria-label={copy.read}><Volume2 size={16} /><span>{copy.read}</span></button>}
      </div>)}
      {chat.partial && <div className="justice-chat-partial"><p>{chat.busy ? copy.waiting : copy.incomplete}</p><div>{toPlainText(chat.partial)}</div></div>}
      {chat.busy && !chat.partial && <p className="justice-chat-status" role="status"><Loader2 size={16} className="animate-spin" />{copy.waiting}</p>}
    </div>

    {chat.error && <p role="alert" className="justice-chat-error">{chat.error}</p>}
    <div className="justice-chat-suggestions">
      <div><span>{copy.suggestions}</span><button type="button" onClick={() => setSuggestionPage(page => page + 1)} disabled={chat.busy || chat.listening}>{copy.more}</button></div>
      <div className="justice-chat-chips">{visibleSuggestions.map((question, index) => <button type="button" key={question} className="motion-item" style={{ "--motion-index": index } as CSSProperties} disabled={chat.busy || chat.listening} onClick={() => { chat.editInput(question); input.current?.focus(); }}>{question}</button>)}</div>
    </div>

    <form className="justice-chat-compose" onSubmit={event => { event.preventDefault(); void chat.send(); }}>
      <label className="sr-only" htmlFor={`${id}-question`}>{copy.question}</label>
      <textarea ref={input} id={`${id}-question`} value={chat.input} onChange={event => chat.editInput(event.target.value)} disabled={chat.busy || chat.listening} maxLength={8000} rows={compact ? 2 : 3} placeholder={chat.listening ? copy.listening : copy.placeholder} aria-describedby={`${id}-voice-hint`} />
      <div className="justice-chat-actions">
        <div>
          <button type="button" className={`justice-chat-icon ${chat.listening ? "is-listening" : ""}`} disabled={!chat.speechSupported || chat.busy} onClick={chat.toggleMicrophone} aria-label={chat.listening ? copy.stopMicrophone : copy.microphone} aria-pressed={chat.listening}>{chat.listening ? <MicOff size={19} /> : <Mic size={19} />}</button>
          <span>{chat.listening ? copy.listening : chat.speechSupported ? copy.voice : copy.typedOnly}</span>
          {chat.speaking && <button type="button" className="justice-chat-icon" onClick={chat.stopReading} aria-label={copy.stopRead} title={copy.stopRead}><VolumeX size={19} /></button>}
        </div>
        {chat.busy ? <button type="button" className="justice-chat-send" onClick={chat.cancel}><Square size={15} />{copy.stop}</button> : <button type="submit" className="justice-chat-send" disabled={!chat.input.trim() || chat.listening}><Send size={15} />{copy.send}</button>}
      </div>
      <p id={`${id}-voice-hint`} className="justice-chat-hint">{chat.origin === "voice" && !chat.listening ? copy.review : copy.voiceHint}</p>
    </form>
    {!compact && <div className="justice-chat-footnote">{chat.messages.length > 0 && <SaveToCase kind="chat" title={copy.saveTitle} content={chat.messages.map(message => `${message.role}: ${message.content}`).join("\n\n")} metadata={{ tool: "chat", language, ai: chat.messages.at(-1)?.result?.metadata }} />}<p>{copy.disclaimer}</p></div>}
  </div>;
}

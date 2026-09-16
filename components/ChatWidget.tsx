"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Maximize2, MessageSquare, X } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { chatCopy } from "@/lib/chat-copy";
import ChatExperience from "@/components/chat/ChatExperience";
import { useChatSession } from "@/components/chat/ChatSessionProvider";

/** Mount once in the root layout; ChatSessionProvider owns the conversation. */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { language } = usePreferences();
  const chat = useChatSession();
  const copy = chatCopy(language);
  const launcher = useRef<HTMLButtonElement>(null);
  const restoreLauncherFocus = useRef(false);
  const fullPage = pathname === "/citizen/voice-assistant";
  useEffect(() => { if (fullPage) setOpen(false); }, [fullPage]);
  useEffect(() => {
    if (!open && restoreLauncherFocus.current) {
      restoreLauncherFocus.current = false;
      if (!fullPage) launcher.current?.focus();
    }
  }, [open, fullPage]);
  function close() { restoreLauncherFocus.current = true; setOpen(false); chat.stopVoice(); }

  return <div className="justice-chat-widget" hidden={fullPage}>
    <button ref={launcher} type="button" onClick={() => setOpen(true)} className="justice-chat-launcher" hidden={open} aria-label={copy.open} aria-expanded={open} aria-controls="justice-global-chat"><MessageSquare size={23} /></button>
    <section id="justice-global-chat" className="justice-chat-panel" hidden={!open} aria-label={copy.title} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
      <header><div><Bot size={22} /><div><h2>{copy.title}</h2><p>{copy.subtitle}</p></div></div><nav aria-label={copy.title}><Link href="/citizen/voice-assistant" onClick={close} title={copy.expand} aria-label={copy.expand}><Maximize2 size={17} /></Link><button type="button" onClick={close} aria-label={copy.close}><X size={19} /></button></nav></header>
      <ChatExperience compact active={open && !fullPage} />
    </section>
  </div>;
}

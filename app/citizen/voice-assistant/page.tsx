"use client";

import PageHeader from "@/components/PageHeader";
import ChatExperience from "@/components/chat/ChatExperience";
import { usePreferences } from "@/components/PreferencesProvider";
import { chatCopy } from "@/lib/chat-copy";

export default function VoiceAssistantPage() {
  const { language } = usePreferences();
  const copy = chatCopy(language);
  return <div className="workspace-page"><PageHeader title={copy.pageTitle} description={copy.pageDescription} /><div className="justice-chat-page"><ChatExperience /></div></div>;
}

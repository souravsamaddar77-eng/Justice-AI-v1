import { FileSearch, MessageSquare, Mic, CalendarCheck2, Users, Compass, PenLine, ArrowLeftRight, BookOpen, BriefcaseBusiness, ClipboardCheck, Gavel, FolderOpen } from "lucide-react";
export const TOOLS = [
  { title: "Understand a notice", description: "Read a legal notice in plain language.", href: "/victim-citizen", group: "Get legal help", icon: FileSearch },
  { title: "Talk to the assistant", description: "Ask questions by voice or text.", href: "/citizen/voice-assistant", group: "Get legal help", icon: Mic },
  { title: "Action tracker", description: "Review next steps and manage case tasks.", href: "/citizen/action-tracker", group: "Get legal help", icon: CalendarCheck2 },
  { title: "Find a lawyer", description: "Explore the sample lawyer directory.", href: "/citizen/lawyers", group: "Get legal help", icon: Users },
  { title: "Free legal aid", description: "Find clinics and legal aid resources.", href: "/citizen#legal-aid", group: "Get legal help", icon: Compass },
  { title: "Draft a document", description: "Prepare a first draft for review.", href: "/advocate?tool=drafting", group: "For your practice", icon: PenLine },
  { title: "IPC to BNS converter", description: "Search the section mapping reference.", href: "/advocate?tool=converter", group: "For your practice", icon: ArrowLeftRight },
  { title: "Precedents & judgments", description: "Browse research and Indian Kanoon links.", href: "/advocate/precedents", group: "For your practice", icon: BookOpen },
  { title: "Case intake", description: "Explore the case brief demonstration.", href: "/advocate/cases", group: "For your practice", icon: BriefcaseBusiness },
  { title: "Draft review", description: "Review legal drafts and compare proposed edits.", href: "/advocate/draft-review", group: "For your practice", icon: ClipboardCheck },
  { title: "Advocate network", description: "Browse the demonstration network.", href: "/advocate/network", group: "For your practice", icon: MessageSquare },
  { title: "Lok Adalat", description: "Find sittings and mediation information.", href: "/advocate?tool=lok-adalat", group: "For your practice", icon: Gavel },
  { title: "My cases", description: "Keep documents, tasks and reviewed work together.", href: "/cases", group: "Your workspace", icon: FolderOpen },
];

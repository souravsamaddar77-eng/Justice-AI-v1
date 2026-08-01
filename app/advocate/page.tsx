"use client";

import { Briefcase, ArrowLeftRight, Wand2, Info } from "lucide-react";
import IpBnsConverter from "@/components/IpBnsConverter";
import DraftingCopilot from "@/components/DraftingCopilot";
import ChatWidget from "@/components/ChatWidget";

export default function AdvocatePage() {
  return (
    <div className="bg-navy-50/40">
      {/* Header */}
      <section className="border-b border-navy-200/70 bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <span className="eyebrow text-gold-400">Advocate Portal</span>
          <h1 className="mt-2 flex items-center gap-3 font-serif text-3xl font-bold">
            <Briefcase className="h-8 w-8 text-gold-300" /> Advocate Workspace
          </h1>
          <p className="mt-2 max-w-2xl text-navy-300">
            Two tools for a faster practice — convert old IPC sections to the new BNS 2023, and draft
            bail applications, replies, and notices with an AI co-pilot.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-12">
        {/* ───────── IPC ↔ BNS converter ───────── */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-gold-300">
              <ArrowLeftRight className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-serif text-2xl font-semibold text-navy-900">IPC ↔ BNS Converter</h2>
              <p className="text-sm text-navy-500">Search any IPC section to find the matching BNS 2023 section.</p>
            </div>
          </div>
          <IpBnsConverter />
          <p className="mt-3 flex items-center gap-1.5 text-xs text-navy-500">
            <Info className="h-3.5 w-3.5 text-gold-600" />
            Sample mapping subset — verify against the official BNS 2023 text before real-world use.
          </p>
        </section>

        {/* ───────── Drafting co-pilot ───────── */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-gold-300">
              <Wand2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-serif text-2xl font-semibold text-navy-900">Drafting Co-Pilot</h2>
              <p className="text-sm text-navy-500">Fill the form on the left; AI drafts the document on the right.</p>
            </div>
          </div>
          <DraftingCopilot />
        </section>
      </div>

      {/* Floating chatbot (advocate persona) */}
      <ChatWidget persona="advocate" />
    </div>
  );
}

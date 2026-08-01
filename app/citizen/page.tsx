"use client";

import { useState } from "react";
import { UserRound, Upload, Loader2, FileSearch, Info } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import SummaryCard from "@/components/SummaryCard";
import DeadlineTracker from "@/components/DeadlineTracker";
import UrgencyBadge from "@/components/UrgencyBadge";
import ChatWidget from "@/components/ChatWidget";
import type { AnalyzeResponseBody } from "@/types";

export default function CitizenPage() {
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResponseBody | null>(null);
  const [error, setError] = useState("");

  async function analyze(text: string, filename: string) {
    setBusy(true);
    setError("");
    setAnalysis(null);
    try {
      const res = await fetch("/api/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, filename }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AnalyzeResponseBody = await res.json();
      setAnalysis(data);
    } catch {
      setError("Sorry, analysis failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-navy-50/40">
      {/* Header */}
      <section className="border-b border-navy-200/70 bg-navy-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <span className="eyebrow text-gold-400">Citizen Portal</span>
          <h1 className="mt-2 flex items-center gap-3 font-serif text-3xl font-bold">
            <UserRound className="h-8 w-8 text-gold-300" /> Get Legal Help
          </h1>
          <p className="mt-2 max-w-2xl text-navy-300">
            Upload a legal notice (PDF or image). Justice AI will read it, flag the urgency, track your
            response deadline, and explain it in plain language — all in seconds.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* Upload zone */}
        {!analysis && (
          <div className="mx-auto max-w-xl">
            <FileUpload onAnalyze={analyze} busy={busy} />
            {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
          </div>
        )}

        {/* Loading shimmer */}
        {busy && (
          <div className="flex flex-col items-center justify-center py-16 text-navy-500">
            <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
            <p className="mt-3 text-sm">Reading your notice… this takes a few seconds.</p>
          </div>
        )}

        {/* Analysis dashboard */}
        {analysis && !busy && (
          <div className="space-y-6">
            {/* Top bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-navy-900">
                <FileSearch className="h-6 w-6 text-gold-600" /> Analysis Dashboard
              </h2>
              <div className="flex items-center gap-3">
                <SourcePill source={analysis.source} />
                <button
                  onClick={() => setAnalysis(null)}
                  className="rounded-xl border border-navy-300 bg-white px-3.5 py-1.5 text-sm font-medium text-navy-600 hover:border-gold-400 hover:text-navy-900"
                >
                  Analyze another notice
                </button>
              </div>
            </div>

            {/* Urgency + headline */}
            <div className="card-surface flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Notice urgency</p>
                <div className="mt-1.5">
                  <UrgencyBadge urgency={analysis.urgency} />
                </div>
              </div>
              <p className="max-w-sm text-sm text-navy-600">
                Based on the language and deadlines in your notice, we've rated how urgently you should act.
              </p>
            </div>

            {/* Deadline + summary */}
            <div className="grid gap-6 md:grid-cols-2">
              <DeadlineTracker daysToRespond={analysis.daysToRespond} deadlineDate={analysis.deadlineDate} />
              <SummaryCard summary={analysis.summary} />
            </div>

            {/* Key terms */}
            <div className="card-surface p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-navy-500">
                <Info className="h-3.5 w-3.5" /> Key legal terms detected
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.keyTerms.length > 0 ? (
                  analysis.keyTerms.map((t, i) => (
                    <span key={i} className="rounded-lg bg-navy-100 px-3 py-1.5 text-sm font-medium text-navy-700">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-navy-400">No specific terms detected.</span>
                )}
              </div>
            </div>

            {/* Demo info note for the redaction toggle */}
            <div className="flex items-start gap-2 rounded-xl border border-gold-200 bg-gold-50/60 p-4 text-sm text-navy-700">
              <Info className="mt-0.5 h-4 w-4 text-gold-600" />
              <p>
                This prototype analyzes the filename or pasted text. Auto-redaction masks Aadhaar/PAN/phone
                patterns client-side before display. Connect a real PDF parser for full extraction.
              </p>
            </div>

            {/* Re-upload row */}
            <div className="mx-auto max-w-xl pt-2">
              <FileUpload onAnalyze={analyze} busy={busy} />
            </div>
          </div>
        )}
      </div>

      {/* Floating chatbot */}
      <ChatWidget persona="citizen" />
    </div>
  );
}

function SourcePill({ source }: { source: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    gemini: { label: "Gemini", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    mock: { label: "Demo mock", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  };
  const s = map[source] || { label: source, cls: "bg-navy-100 text-navy-700 ring-navy-200" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${s.cls}`}>
      ⚡ {s.label}
    </span>
  );
}

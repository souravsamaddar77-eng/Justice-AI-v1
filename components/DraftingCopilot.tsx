"use client";

import { useEffect, useRef, useState } from "react";
import { Wand2, Loader2, Copy, Check, FileText, Download } from "lucide-react";
import { usePreferences } from "./PreferencesProvider";
import { toPlainText } from "@/lib/plain-text";
import { openDraftPrintView } from "@/lib/draft-print";
import SaveToCase from "./SaveToCase";
import { readAIResponse } from "@/lib/ai-client";
import type { DocumentType, DraftResponseBody } from "@/types";

const DOC_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "bail_application", label: "Bail Application" },
  { value: "reply_to_notice", label: "Reply to Legal Notice" },
  { value: "legal_notice_draft", label: "Legal Notice Draft" },
  { value: "affidavit", label: "Affidavit" },
];

export default function DraftingCopilot() {
  const today = new Date().toISOString().slice(0, 10);

  const [clientName, setClientName] = useState("");
  const [issue, setIssue] = useState("");
  const [date, setDate] = useState(today);
  const [documentType, setDocumentType] = useState<DocumentType>("bail_application");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [result, setResult] = useState<DraftResponseBody | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [partial, setPartial] = useState("");
  const [stage, setStage] = useState("");
  const request = useRef<AbortController | null>(null);
  const { language, t } = usePreferences();
  const [resultLanguage, setResultLanguage] = useState(language);
  useEffect(() => () => request.current?.abort(), []);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (request.current) return;
    setBusy(true);
    setError("");

    // Form validation
    if (!clientName.trim()) {
      setError("Client name is required");
      setBusy(false);
      return;
    }
    if (!issue.trim()) {
      setError("Issue/matter is required");
      setBusy(false);
      return;
    }
    if (!date.trim()) {
      setError("Date is required");
      setBusy(false);
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    setPartial("");
    setStage("Preparing your draft…");
    try {
      const res = await fetch("/api/draft-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ clientName, issue, date, documentType, additionalNotes, language, stream: true }),
      });
      const data = await readAIResponse<DraftResponseBody>(res, delta => setPartial(prev => prev + delta), setStage, () => setPartial(""));
      setResult({ ...data, title: toPlainText(data.title), document: toPlainText(data.document) });
      setResultLanguage(language);
      setPartial("");
    } catch (error) {
      setError(controller.signal.aborted ? "Cancelled. Your form, previous draft and partial output are retained." : error instanceof Error ? error.message : "Could not generate the draft. Your input is retained.");
    } finally {
      request.current = null;
      setBusy(false);
    }
  }

  async function copyDoc() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.document);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Clipboard failed:", err);
      setError("Failed to copy to clipboard. Please try again.");
      // Auto-clear error after 3 seconds
      setTimeout(() => setError(""), 3000);
    }
  }

  /** Use native Indic shaping when the browser prints or saves the draft as PDF. */
  function downloadPdf() {
    if (!result) return;
    try { openDraftPrintView({ title: result.title, document: result.document, language: resultLanguage, simulated: result.source === "mock" }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not open the print view. Your draft is retained."); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* LEFT — form inputs */}
      <form onSubmit={generate} className="card-surface flex flex-col p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500/15">
            <Wand2 className="h-5 w-5 text-gold-600" />
          </span>
          <div>
            <h3 className="font-serif text-lg font-semibold text-navy-900">Drafting Co-Pilot</h3>
            <p className="text-xs text-navy-500">Fill the details — AI drafts the document.</p>
          </div>
        </div>

        <div className="space-y-4">
          <Field label={t("Document type")}>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="input-field"
            >
              {DOC_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.label)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("Client name")}>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="input-field"
            />
          </Field>

          <Field label={t("Issue / matter")}>
            <textarea
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              rows={3}
              placeholder="e.g. Cheque bounce of ₹2,00,000 issued in Jan 2025"
              className="input-field resize-none"
            />
          </Field>

          <Field label={t("Date")}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
          </Field>

          <Field label={t("Additional notes (optional)")}>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={2}
              placeholder="Any extra facts or grounds to include…"
              className="input-field resize-none"
            />
          </Field>
        </div>

        <p className="mt-5 text-xs text-navy-500">{t("Submitted text is processed by external AI services. Avoid unnecessary personal details.")}</p>
        <button type="submit" disabled={busy} className="btn-primary mt-4 w-full disabled:opacity-60">
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("Drafting…")}
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" /> {t("Generate Draft")}
            </>
          )}
        </button>
        {busy && <button type="button" onClick={() => request.current?.abort()} className="mt-2 rounded-lg border border-navy-200 py-2 text-sm text-navy-700">{t("Cancel generation")}</button>}
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      </form>

      {/* RIGHT — preview */}
      <div className="card-surface flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gold-600" />
            <span className="text-sm font-semibold text-navy-800">
              {result ? result.title : t("Document Preview")}
            </span>
          </div>
          {result && (
            <div className="flex items-center gap-2">
              <button
                onClick={copyDoc}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-navy-600 hover:bg-navy-100"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t("Copied") : t("Copy")}
              </button>
              <button
                onClick={downloadPdf}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-navy-600 hover:bg-navy-100"
                title="Print or save as PDF"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-navy-50/30 p-5" aria-live="polite">
          {busy && <p className="mb-4 flex items-center gap-2 text-sm text-navy-500"><Loader2 className="h-4 w-4 animate-spin text-gold-500" />{stage}</p>}
          {partial && <article className="mb-5 rounded-xl border border-gold-200 bg-gold-50/50 p-4"><p className="mb-3 text-xs font-semibold text-gold-800">{busy ? "Draft in progress" : "Incomplete draft · not saved or exportable"}</p><pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-navy-800">{toPlainText(partial)}</pre></article>}
          {result ? (
            <article className="prose-sm">
              {/* Source banner */}
              <div className="mb-3">
                <SourceBadge source={result.source} />
                <p className="mt-2 text-xs text-navy-500">Unreviewed AI draft · Check facts and applicable law before use.</p>
              </div>
              <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-navy-800">
                {result.document}
              </pre>
              {result.source !== "mock" && <div className="mt-4"><SaveToCase kind="draft" title={result.title} content={result.document} metadata={{ source: result.source, ai: result.metadata, reviewState: "ai_draft" }} /></div>}
            </article>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-navy-400">
              <FileText className="h-10 w-10 text-navy-300" />
              <p className="max-w-xs text-sm">
                Your generated document will appear here. Try a bail application with sample details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-500">{label}</span>
      {children}
    </label>
  );
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    nemotron: { label: "AI-generated", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    gemini: { label: "AI-generated", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    groq: { label: "AI-generated", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    mock: { label: "Demo mock", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  };
  const s = map[source] || { label: source, cls: "bg-navy-100 text-navy-700 ring-navy-200" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${s.cls}`}>
      ⚡ {s.label}
    </span>
  );
}

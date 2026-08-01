"use client";

import { useState } from "react";
import { Wand2, Loader2, Copy, Check, FileText } from "lucide-react";
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

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/draft-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, issue, date, documentType, additionalNotes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DraftResponseBody = await res.json();
      setResult(data);
    } catch {
      setError("Could not generate the draft. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function copyDoc() {
    if (!result) return;
    navigator.clipboard.writeText(result.document);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
          <Field label="Document type">
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="input"
            >
              {DOC_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Client name">
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Ramesh Kumar" className="input" />
          </Field>

          <Field label="Issue / matter">
            <textarea
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              rows={3}
              placeholder="e.g. Cheque bounce of ₹2,00,000 issued in Jan 2025"
              className="input resize-none"
            />
          </Field>

          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </Field>

          <Field label="Additional notes (optional)">
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={2}
              placeholder="Any extra facts or grounds to include…"
              className="input resize-none"
            />
          </Field>
        </div>

        <button type="submit" disabled={busy} className="btn-primary mt-5 w-full disabled:opacity-60">
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Drafting…
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" /> Generate Draft
            </>
          )}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>

      {/* RIGHT — preview */}
      <div className="card-surface flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gold-600" />
            <span className="text-sm font-semibold text-navy-800">
              {result ? result.title : "Document Preview"}
            </span>
          </div>
          {result && (
            <button
              onClick={copyDoc}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-navy-600 hover:bg-navy-100"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-navy-50/30 p-5">
          {busy ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-navy-400">
              <Loader2 className="h-7 w-7 animate-spin text-gold-500" />
              <p className="text-sm">Generating your legal document…</p>
            </div>
          ) : result ? (
            <article className="prose-sm">
              {/* Source banner */}
              <div className="mb-3">
                <SourceBadge source={result.source} />
              </div>
              <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-navy-800">
                {result.document}
              </pre>
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

      {/* Tailwind input helper class, scoped inside this file via globals @apply */}
      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          border-color: #fbbf24;
          box-shadow: 0 0 0 2px #fde68a;
        }
      `}</style>
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
    nemotron: { label: "Nemotron", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    mock: { label: "Demo mock", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  };
  const s = map[source] || { label: source, cls: "bg-navy-100 text-navy-700 ring-navy-200" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${s.cls}`}>
      ⚡ {s.label}
    </span>
  );
}

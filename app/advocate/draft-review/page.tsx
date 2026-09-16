"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Copy, Download, FileSearch, Loader2, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { usePreferences } from "@/components/PreferencesProvider";
import type { DraftReviewResponse } from "@/lib/draft-review";
import styles from "./review.module.css";

const KIND_LABELS = { "risky-term": "Risky term", "missing-clause": "Missing clause", ambiguity: "Ambiguity", inconsistency: "Inconsistency", formatting: "Formatting" };

function readFile(file: File, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const abort = () => reader.abort();
    const clean = () => signal.removeEventListener("abort", abort);
    reader.onload = () => { clean(); resolve(String(reader.result)); };
    reader.onerror = () => { clean(); reject(new Error("Could not read this file. Select it again or paste its text.")); };
    reader.onabort = () => { clean(); reject(new DOMException("Cancelled", "AbortError")); };
    if (signal.aborted) { reject(new DOMException("Cancelled", "AbortError")); return; }
    signal.addEventListener("abort", abort, { once: true }); reader.readAsDataURL(file);
  });
}

export default function DraftReviewPage() {
  const { language, t } = usePreferences();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [review, setReview] = useState<DraftReviewResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [severity, setSeverity] = useState("all");
  const [query, setQuery] = useState("");
  const active = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const highlight = useRef<HTMLElement | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => { highlight.current?.scrollIntoView({ block: "nearest", behavior: "instant" }); }, [selected]);
  function invalidate() { setReview(null); setSelected(null); setError(""); setCopied(false); setStatus(""); }
  function chooseFile(next: File | null) {
    invalidate(); setFile(next); setText("");
    if (next && (!/\.(pdf|png|jpe?g|txt)$/i.test(next.name) || !next.size || next.size > 2 * 1024 * 1024)) {
      setFile(null); if (fileInput.current) fileInput.current.value = "";
      setError("Choose a non-empty PDF, PNG, JPEG or UTF-8 TXT file up to 2 MB. Export Word files to PDF or paste the text.");
    }
  }
  function cancel() { active.current?.abort(); active.current = null; setBusy(false); setStatus("Review cancelled. Your input is retained."); }
  async function analyze() {
    if (active.current || (!file && !text.trim())) return;
    const controller = new AbortController(); active.current = controller;
    invalidate(); setBusy(true); setStatus(file ? "Reading your document and reviewing its clauses…" : "Reviewing your draft…");
    try {
      const body = file ? { fileBase64: await readFile(file, controller.signal), filename: file.name, language } : { text, language };
      if (controller.signal.aborted) return;
      const response = await fetch("/api/review-draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Review failed. Retry with your retained draft.");
      if (active.current !== controller || controller.signal.aborted) return;
      setReview(data); setSeverity("all"); setQuery(""); setSelected(data.findings[0]?.id || null); setStatus("Review complete.");
    } catch (failure) {
      if (active.current === controller && !controller.signal.aborted) { setError(failure instanceof Error ? failure.message : "Review failed. Please retry."); setStatus(""); }
    } finally { if (active.current === controller) { active.current = null; setBusy(false); } }
  }
  function reportText() {
    if (!review) return "";
    return `Justice AI draft review\nDocument: ${review.filename}\nUnreviewed AI suggestions; advocate review required.\n\n${review.summary}\n\n${review.findings.length} findings\n\n` + review.findings.map((item, i) =>
      `${i + 1}. ${item.title} (${item.severity})\n${KIND_LABELS[item.kind]}\n${item.explanation}\n${item.location ? `Extracted-text paragraph ${item.location.paragraph}\nOriginal: ${item.originalText}` : "Suggested addition; no source passage"}\nProposed wording: ${item.replacementText}${item.legalReference ? `\nLegal reference (verify): ${item.legalReference}` : ""}`).join("\n\n");
  }
  async function copy() { try { await navigator.clipboard.writeText(reportText()); setCopied(true); } catch { setError("Copy is unavailable. Download the review instead."); } }
  function download() {
    const url = URL.createObjectURL(new Blob([reportText()], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "justice-ai-draft-review.txt"; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const current = review?.findings.find(item => item.id === selected);
  const visible = review?.findings.filter(item => (severity === "all" || item.severity === severity) && `${item.title} ${item.explanation} ${item.originalText}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())) || [];

  return <div className={styles.page}>
    <PageHeader eyebrow="Advocate tools" title="Draft Redlining & Anomaly Detection" description="Review a legal draft for risky terms, missing clauses and inconsistencies. Compare each proposed edit with the actual source text." />
    <section className={`${styles.input} glass-card`} aria-labelledby="review-input-title">
      <div className={styles.inputHeading}><FileSearch size={23} aria-hidden="true" /><h2 id="review-input-title">Your legal draft</h2></div>
      <label className={styles.fileLabel}>Upload a document<input ref={fileInput} type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" disabled={busy} onChange={event => chooseFile(event.target.files?.[0] || null)} /></label>
      <p className={styles.muted}>PDF, PNG, JPEG or UTF-8 TXT, up to 2 MB. Scanned pages use OCR. For Word documents, export to PDF or paste the text.</p>
      {file ? <p className={styles.fileName}>{file.name}<button type="button" disabled={busy} onClick={() => { chooseFile(null); if (fileInput.current) fileInput.current.value = ""; }} aria-label="Remove selected document"><X size={17} /></button></p> :
        <label className={styles.textLabel}>{t("Paste text instead")}<textarea value={text} disabled={busy} maxLength={50000} rows={7} placeholder="Paste your agreement, notice, pleading or other legal draft…" onChange={event => { invalidate(); setText(event.target.value); }} /><span className={styles.muted}>{text.length.toLocaleString()} / 50,000 characters</span></label>}
      <p className={styles.muted}>Submitted text is processed by external AI services. Scans are sent to OCR.space. Avoid unnecessary personal details.</p>
      <div className={styles.actions}><button className="btn-primary" type="button" onClick={() => void analyze()} disabled={busy || (!file && !text.trim())}>{busy ? <Loader2 size={17} className="animate-spin" /> : <FileSearch size={17} />}{busy ? "Reviewing draft…" : "Review draft"}</button>{busy && <button type="button" className="btn-secondary" onClick={cancel}>Cancel review</button>}<span role="status" className={styles.muted}>{status}</span></div>
    </section>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {review && <section aria-labelledby="review-result-title" className={`${styles.results} glass-card`}>
      <div className={styles.summary}><div><h2 id="review-result-title">Review findings</h2><p>{review.summary}</p><p className={styles.muted}>Unreviewed AI suggestions. An advocate should check the findings and proposed wording before use.</p><p className={styles.muted}>{review.extractionMethod === "pasted" ? "Pasted text" : `${review.pageCount} extracted page${review.pageCount === 1 ? "" : "s"}; ${review.extractionMethod === "native" ? "embedded text" : review.extractionMethod === "mixed" ? "embedded text and OCR" : "OCR"}`}. Paragraph numbers refer to extracted text.</p></div><div className={styles.actions}><button type="button" onClick={() => void copy()} className="btn-secondary">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy review"}</button><button type="button" onClick={download} className="btn-secondary"><Download size={16} />Download review</button></div></div>
      <div className={styles.filters}><label>Severity<select value={severity} onChange={event => setSeverity(event.target.value)}><option value="all">All ({review.findings.length})</option>{(["high", "medium", "low"] as const).map(level => <option key={level} value={level}>{level[0].toUpperCase() + level.slice(1)} ({review.findings.filter(item => item.severity === level).length})</option>)}</select></label><label>Search findings<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Clause, term or concern" /></label></div>
      <div className={styles.workspace}>
        <section className={styles.document} aria-labelledby="source-title"><h3 id="source-title">Original text</h3><p className={styles.muted}>{current?.location ? "The selected finding is highlighted below." : "Select a finding to highlight its source. Missing clauses have no source passage."}</p><pre>{current?.location ? <>{review.documentText.slice(0, current.location.start)}<mark ref={highlight}>{review.documentText.slice(current.location.start, current.location.end)}</mark>{review.documentText.slice(current.location.end)}</> : review.documentText}</pre></section>
        <section className={styles.findings} aria-label="Document findings">
          {review.findings.length === 0 ? <div className={styles.empty}><Check size={26} /><h3>No material issues flagged</h3><p>The AI did not identify material issues in the supplied text. This does not establish that the document is complete or legally valid.</p></div> : visible.length === 0 ? <p className={styles.empty}>No findings match these filters.</p> : visible.map((item, index) => <article key={item.id} className={`${styles.finding} motion-item ${selected === item.id ? styles.selected : ""}`} style={{ "--motion-index": Math.min(index, 7) } as CSSProperties}>
            <button type="button" className={styles.findingTitle} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}><span className={styles.severity} data-level={item.severity}>{item.severity} priority</span><h3>{item.title}</h3><span className={styles.muted}>{KIND_LABELS[item.kind]}{item.location ? ` · Paragraph ${item.location.paragraph}` : " · Suggested addition"}</span></button>
            <p>{item.explanation}</p><div className={styles.redline}>{item.originalText && <><span className={styles.editLabel}>Original wording</span><del>{item.originalText}</del></>}<span className={styles.editLabel}>{item.location ? "Proposed replacement" : "Proposed addition"}</span><ins>{item.replacementText}</ins></div>
            {item.legalReference && <p className={styles.muted}>Legal reference to verify: {item.legalReference}</p>}
          </article>)}
        </section>
      </div>
    </section>}
  </div>;
}

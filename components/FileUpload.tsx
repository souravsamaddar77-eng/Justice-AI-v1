"use client";
import { useRef, useState } from "react";
import { UploadCloud, FileText, Loader2, ShieldCheck } from "lucide-react";
interface Props { onAnalyze: (text: string, filename: string, fileBase64?: string, options?: { redact: boolean }) => Promise<void>; busy: boolean }
export default function FileUpload({ onAnalyze, busy }: Props) {
  const [dragging, setDragging] = useState(false); const [file, setFile] = useState<File | null>(null); const [redact, setRedact] = useState(true); const [error, setError] = useState(""); const [manual, setManual] = useState(""); const [reading, setReading] = useState(false);
  const input = useRef<HTMLInputElement>(null); const readingRef = useRef(false);
  const disabled = busy || reading;
  async function analyzeFile(selected: File) {
    if (disabled || readingRef.current) return;
    setFile(selected); setError("");
    if (!/\.(pdf|png|jpe?g|txt)$/i.test(selected.name)) { setError("Choose a PDF, PNG, JPEG or UTF-8 TXT file. For Word documents, export to PDF or paste text below."); return; }
    if (!selected.size || selected.size > 2 * 1024 * 1024) { setError("Choose a non-empty file up to 2 MB. OCR may have a smaller plan limit."); return; }
    readingRef.current = true; setReading(true);
    try {
      if (/\.txt$/i.test(selected.name)) { const bytes = await selected.arrayBuffer(); const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); await onAnalyze(text, selected.name, undefined, { redact }); }
      else {
        const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Could not read the selected file.")); reader.readAsDataURL(selected); });
        await onAnalyze("", selected.name, base64, { redact });
      }
    } catch (error) { setError(error instanceof Error ? error.message : "Could not read this file. Retry or paste its text below."); }
    finally { readingRef.current = false; setReading(false); }
  }
  return <div className="card-surface p-5 sm:p-6">
    <button type="button" disabled={disabled} onClick={() => input.current?.click()} onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.[0]) void analyzeFile(e.dataTransfer.files[0]); }} className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-9 text-center transition disabled:cursor-wait ${dragging ? "border-gold-400 bg-gold-50" : "border-navy-200 bg-navy-50/50 hover:border-gold-400"}`}>
      {disabled ? <Loader2 className="h-9 w-9 animate-spin text-gold-600" /> : <UploadCloud className="h-9 w-9 text-gold-600" />}
      <span className="mt-3 font-semibold text-navy-800">{busy ? "Extracting text and validating analysis…" : reading ? "Reading your selected file…" : "Choose or drop a legal notice"}</span>
      <span className="mt-1 text-xs text-navy-500">PDF, PNG, JPEG or TXT · up to 2 MB</span>
    </button>
    <input ref={input} type="file" aria-label="Select notice file" accept=".pdf,.png,.jpg,.jpeg,.txt" className="hidden" disabled={disabled} onChange={e => { const selected = e.target.files?.[0]; if (selected) void analyzeFile(selected); e.target.value = ""; }} />
    {file && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-700"><FileText className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 break-all">{file.name} · retained in this page</span><button type="button" disabled={disabled} onClick={() => void analyzeFile(file)} className="font-semibold text-gold-700 underline disabled:opacity-50">Retry file</button></div>}
    <label className="mt-4 flex items-start gap-2 rounded-xl border border-navy-200 p-3 text-xs text-navy-600"><input type="checkbox" checked={redact} onChange={e => setRedact(e.target.checked)} disabled={disabled} className="mt-0.5 accent-gold-600" /><span><span className="flex items-center gap-1.5 font-semibold text-navy-800"><ShieldCheck className="h-4 w-4" />Mask common identifiers in extracted text</span><span className="mt-1 block leading-relaxed">Masks common Aadhaar, PAN and phone patterns before AI analysis. It may miss some details. The original scan is sent to OCR.space before this masking.</span></span></label>
    <details className="mt-4 rounded-xl border border-navy-200 p-3"><summary className="cursor-pointer text-sm font-medium text-navy-800">Paste text instead</summary><p className="mt-2 text-xs text-navy-500">Use this if a scan cannot be read. Your selected file remains above.</p><textarea value={manual} onChange={e => setManual(e.target.value)} aria-label="Notice text" rows={5} maxLength={60000} className="mt-3 w-full rounded-lg border border-navy-200 p-3 text-sm" placeholder="Paste the notice text here…" /><button type="button" disabled={disabled || !manual.trim()} onClick={() => void onAnalyze(manual, file?.name || "manual-text.txt", undefined, { redact })} className="btn-primary mt-2 text-sm disabled:opacity-50">Analyze pasted text</button></details>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </div>;
}

"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, Loader2, ShieldCheck, Lock, FileType } from "lucide-react";

interface Props {
  onAnalyze: (text: string, filename: string, fileBase64?: string) => Promise<void>;
  busy: boolean;
}

export default function FileUpload({ onAnalyze, busy }: Props) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [redact, setRedact] = useState(true);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = ".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx";

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    return btoa(binary);
  };

  const handleFile = useCallback(
    async (f: File) => {
      setError("");
      setFile(f);
      let text = "";
      let fileBase64: string | undefined;

      // Text files: read content for real analysis
      if (/\.(txt)$/i.test(f.name)) {
        try {
          text = await f.text();
        } catch {
          text = "";
        }
      }
      // PDF and image files: convert to base64 for server-side extraction or OCR
      else if (/\.(pdf|png|jpe?g|tiff?|bmp|gif)$/i.test(f.name)) {
        try {
          const arrayBuffer = await f.arrayBuffer();
          fileBase64 = arrayBufferToBase64(arrayBuffer);
        } catch {
          fileBase64 = undefined;
        }
      }
      // Other types (DOC): rely on filename for now (UI demo)
      else {
        // For DOC files, we don't have a real extraction, so we leave fileBase64 undefined
        fileBase64 = undefined;
      }

      await onAnalyze(text, f.name, fileBase64);
    },
    [onAnalyze]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
  };

  const isPdf = file?.name.toLowerCase().endsWith(".pdf");

  return (
    <div className="card-surface p-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") inputRef.current?.click();
        }}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging
            ? "border-gold-400 bg-gold-50"
            : "border-navy-300 bg-navy-50/50 hover:border-gold-400 hover:bg-gold-50/30"
        }`}
      >
        <input ref={inputRef} type="file" accept={accept} onChange={onChange} className="hidden" />
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/15">
          {busy ? (
            <Loader2 className="h-7 w-7 animate-spin text-gold-600" />
          ) : (
            <UploadCloud className="h-7 w-7 text-gold-600" />
          )}
        </span>
        <p className="mt-3 font-semibold text-navy-800">
          {busy ? "Analyzing your notice…" : "Drag & drop your legal notice here"}
        </p>
        <p className="mt-1 text-sm text-navy-500">or click to browse — PDF, PNG, JPG, TXT, DOC</p>
        {file && !busy && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-navy-600 shadow-sm ring-1 ring-navy-200">
            {isPdf ? <FileType className="h-3.5 w-3.5 text-red-500" /> : <FileText className="h-3.5 w-3.5 text-gold-600" />}
            {file.name}
            {isPdf && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600">PDF text will be extracted</span>}
            {!isPdf && /\.(png|jpe?g|tiff?|bmp|gif)$/i.test(file.name) && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">Image text extracted via OCR</span>
            )}
          </span>
        )}
      </div>

      {/* Redaction toggle */}
      <button
        type="button"
        onClick={() => setRedact((v) => !v)}
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-navy-200 bg-white px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2.5">
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${redact ? "bg-emerald-50" : "bg-navy-100"}`}>
            {redact ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <Lock className="h-5 w-5 text-navy-500" />}
          </span>
          <span>
            <span className="block text-sm font-semibold text-navy-800">Auto-Redact Personal Info</span>
            <span className="block text-xs text-navy-500">Masks Aadhaar / PAN / phone before processing</span>
          </span>
        </span>
        {/* Toggle switch */}
        <span
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            redact ? "bg-gold-500" : "bg-navy-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              redact ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </span>
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import type { AIRequestOptions } from "@/types";
interface Config { configured: boolean; fallbackEnabled: boolean; providers: { id: "gemini" | "nemotron"; name: string }[]; ocr: { name: string; configured: boolean } }
export function useAIConsent() {
  const [config, setConfig] = useState<Config | null>(null); const [accepted, setAccepted] = useState(false); const [mode, setMode] = useState<"live" | "demo">("live"); const [configError, setConfigError] = useState("");
  useEffect(() => { const controller = new AbortController(); fetch("/api/ai/config", { signal: controller.signal, cache: "no-store" }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setConfig).catch(() => { if (!controller.signal.aborted) setConfigError("Could not load AI settings. Refresh to try again, or use demo mode."); }); return () => controller.abort(); }, []);
  const ready = mode === "demo" || Boolean(config?.configured && accepted);
  const requestOptions: AIRequestOptions = { mode, consent: { providers: accepted ? (config?.providers || []).map(p => p.id) : [], ocr: accepted } };
  return { config, configError, accepted, setAccepted, mode, setMode, ready, requestOptions };
}
export default function AIConsent({ value, includeOCR = false }: { value: ReturnType<typeof useAIConsent>; includeOCR?: boolean }) {
  return <div className="rounded-xl border border-navy-200 bg-navy-50/60 p-3 text-xs text-navy-600">
    <div className="mb-2 flex items-center justify-between gap-3"><span className="font-semibold text-navy-800">Processing preference</span><select aria-label="AI processing mode" value={value.mode} onChange={e => { value.setMode(e.target.value as "live" | "demo"); value.setAccepted(false); }} className="rounded-lg border border-navy-200 bg-white px-2 py-1"><option value="live">Live AI</option><option value="demo">Demo · sample output</option></select></div>
    {value.mode === "demo" ? <p>Demo output is simulated and kept separate from saved cases. Use sample information.</p> : <>
      {!value.config ? <p>{value.configError || "Loading external processor settings…"}</p> : !value.config.configured ? <p>Live AI needs a server provider key. Standalone demo tools remain available.</p> : <label className="flex items-start gap-2 leading-relaxed"><input type="checkbox" className="mt-0.5 shrink-0 accent-gold-600" checked={value.accepted} onChange={e => value.setAccepted(e.target.checked)} /><span>I agree to send this tool’s entered text to {value.config.providers.map(p => p.name).join(" and ")}{value.config.fallbackEnabled && value.config.providers.length > 1 ? ", including the secondary provider if the first is unavailable" : ""}{includeOCR ? ". Scans may also be sent to OCR.space for text extraction" : ""}. Only submit material you are permitted to share.</span></label>}
    </>}
  </div>;
}

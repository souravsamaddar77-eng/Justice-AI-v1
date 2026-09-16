import { isLanguage, type Language } from "./i18n";

export interface PrintableDraft {
  title: string;
  document: string;
  language: Language;
  simulated?: boolean;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}

/** Native browser text shaping preserves Indic scripts when printing to PDF. */
export function draftPrintHtml(draft: PrintableDraft, origin: string): string {
  const parsedOrigin = new URL(origin);
  if (!["http:", "https:"].includes(parsedOrigin.protocol)) throw new Error("A website origin is required for the print view.");
  const fontBase = parsedOrigin.origin;
  const title = draft.title.trim() || "Justice AI draft";
  const language = isLanguage(draft.language) ? draft.language : "en";
  return `<!doctype html>
<html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src ${escapeHtml(fontBase)}; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 160))}</title>
<style>
@font-face {font-family: JusticeLatin; src: url('${fontBase}/fonts/NotoSans-Regular.ttf') format('truetype'); font-display: swap;}
@font-face {font-family: JusticeDevanagari; src: url('${fontBase}/fonts/NotoSansDevanagari-Regular.ttf') format('truetype'); font-display: swap;}
@font-face {font-family: JusticeBengali; src: url('${fontBase}/fonts/NotoSansBengali-Regular.ttf') format('truetype'); font-display: swap;}
* {box-sizing: border-box;}
body {margin: 0; padding: 36px; background: #eef1f5; color: #172941; font-family: JusticeLatin, JusticeDevanagari, JusticeBengali, 'Nirmala UI', 'Noto Sans Tamil', 'Noto Sans Telugu', 'Noto Sans Gujarati', 'Noto Sans Kannada', 'Noto Sans Malayalam', 'Noto Sans Gurmukhi', 'Kohinoor Devanagari', 'Kohinoor Bangla', 'Tamil Sangam MN', 'Telugu Sangam MN', 'Gujarati Sangam MN', 'Kannada Sangam MN', 'Malayalam Sangam MN', 'Gurmukhi MN', sans-serif;}
main {max-width: 800px; margin: auto; padding: 40px; background: white;}
.print-actions {max-width: 800px; margin: 0 auto 20px; font-size: 13px; line-height: 1.7;}
button {border: 0; border-radius: 8px; padding: 12px 18px; background: #172941; color: white; font: inherit; cursor: pointer;}
button:focus-visible {outline: 3px solid #b5842d; outline-offset: 3px;}
h1 {font-size: 22px; line-height: 1.6; overflow-wrap: anywhere; font-weight: 600;}
.review-status {border-block: 1px solid #ccd4de; padding: 10px 0; margin: 16px 0 24px; font-size: 10px; line-height: 1.7;}
.draft-body {white-space: pre-wrap; overflow-wrap: anywhere; font-size: 12px; line-height: 1.9; orphans: 3; widows: 3;}
@page {size: A4; margin: 18mm 17mm;}
@media print {body {padding: 0; background: white;} main {padding: 0; max-width: none;} .print-actions {display: none;} h1, .review-status {break-after: avoid;} }
</style></head><body>
<div class="print-actions"><button id="print-draft" type="button">Print / Save as PDF</button><p>Choose “Save as PDF” in the print dialog. This view uses your browser’s language fonts to preserve the draft’s script.</p></div>
<main><h1>${escapeHtml(title)}</h1><p class="review-status">${draft.simulated ? "DEMO SAMPLE — SIMULATED / NOT REVIEWED" : "UNREVIEWED AI DRAFT — Requires advocate review"}</p><div class="draft-body">${escapeHtml(draft.document)}</div></main>
</body></html>`;
}

/** Called directly from the click handler so browsers can permit the print window. */
export function openDraftPrintView(draft: PrintableDraft): void {
  const html = draftPrintHtml(draft, window.location.origin);
  const view = window.open("", "_blank");
  if (!view) throw new Error("Allow pop-ups for Justice AI to print or save this draft as a PDF.");
  view.opener = null;
  view.document.open();
  view.document.write(html);
  view.document.close();
  const print = () => { if (!view.closed) { view.focus(); view.print(); } };
  view.document.getElementById("print-draft")?.addEventListener("click", print);
  // Request the embedded faces explicitly: fonts.ready can resolve before first layout.
  // If a local font fails, native system fonts remain available in the visible view.
  void Promise.allSettled(["JusticeLatin", "JusticeDevanagari", "JusticeBengali"].map(font => view.document.fonts.load(`12px ${font}`)))
    .then(() => view.document.fonts.ready).then(print).catch(() => { /* The visible print button remains available if the window was closed. */ });
}

import "server-only";
import PDFDocument from "pdfkit";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { CaseItem } from "@/types/cases";
import type { CaseContext } from "./server";
import { CaseError } from "./validation";

type FontInfo = { hasGlyphForCodePoint(code: number): boolean };
const fontkit = require("fontkit") as { create(data: Buffer): FontInfo };
const fontNames = ["NotoSans", "NotoSansDevanagari", "NotoSansBengali"] as const;
type FontName = typeof fontNames[number];
let fontCache: { name: FontName; bytes: Buffer; info: FontInfo }[] | null = null;
function fonts() {
  if (!fontCache) fontCache = fontNames.map(name => {
    const bytes = readFileSync(path.join(process.cwd(), "public", "fonts", `${name}-Regular.ttf`));
    return { name, bytes, info: fontkit.create(bytes) };
  });
  return fontCache;
}
function fontRuns(value: string) {
  const runs: { font: FontName; text: string }[] = [];
  for (const char of value.replace(/\r\n?/g, "\n").replace(/\t/g, "    ")) {
    const code = char.codePointAt(0)!;
    const previous = runs[runs.length - 1];
    // Joiners stay inside the same shaping run as their Indic base characters.
    let selected = code === 0x200d || code === 0x200c || /\s/u.test(char) ? previous?.font || "NotoSans" : undefined;
    if (!selected) selected = fonts().find(font => font.info.hasGlyphForCodePoint(code))?.name;
    if (!selected) throw new CaseError(422, "The selected text contains a script or symbol outside the embedded PDF fonts. Use the printable HTML bundle with your device fonts, or select supported text. Direct PDF supports Latin, Devanagari and Bengali.", "PDF_FONT_UNSUPPORTED");
    if (previous?.font === selected) previous.text += char;
    else runs.push({ font: selected, text: char });
  }
  return runs;
}

export async function bundlePdf(ctx: Pick<CaseContext, "record">, items: CaseItem[]): Promise<Buffer> {
  // Validate every emitted private string before starting a PDF stream.
  const allText = [ctx.record.title, ctx.record.description, ctx.record.category,
    ...items.flatMap(item => [item.title, item.content, String(item.metadata.filename || ""), String(item.metadata.source_excerpt || ""), String(item.metadata.assumptions || ""), String(item.metadata.review_comment || "")])];
  allText.forEach(fontRuns);
  const doc = new PDFDocument({ size: "A4", margins: { top: 54, bottom: 62, left: 50, right: 50 }, bufferPages: true,
    info: { Title: `${ctx.record.title} - reviewed case bundle`, Author: "Justice AI", Subject: "Selected case material and recorded review status" } });
  for (const font of fonts()) doc.registerFont(font.name, font.bytes);
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => { doc.on("data", chunk => chunks.push(Buffer.from(chunk))); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  const width = doc.page.width - 100;
  function text(value: unknown, size = 10, color = "#243747", spacing = 9) {
    const lines = String(value ?? "").replace(/\r\n?/g, "\n").split("\n");
    for (const line of lines) {
      const runs = fontRuns(line);
      if (!runs.length) { doc.y += size * 1.3; continue; }
      doc.x = 50;
      for (let index = 0; index < runs.length; index++) {
        doc.font(runs[index].font).fontSize(size).fillColor(color).text(runs[index].text, { width, lineGap: 4, continued: index !== runs.length - 1 });
      }
    }
    doc.y += spacing;
  }
  function title(value: string) {
    if (doc.y > doc.page.height - 145) doc.addPage();
    text(value, 14, "#164e63", 8);
  }
  function section(value: string) { doc.addPage(); text(value, 21, "#123447", 18); }
  function source(item: CaseItem) {
    if (item.metadata.source_item_id) {
      text(`Source document version: ${item.metadata.source_item_id}${item.metadata.source_page ? ` | Page ${item.metadata.source_page}` : ""}`, 8, "#526879", 4);
      if (item.metadata.source_excerpt) text(item.metadata.source_excerpt, 9, "#526879", 5);
    }
    if (item.metadata.assumptions) text(`Assumptions: ${item.metadata.assumptions}`, 9, "#526879", 8);
  }
  text("JUSTICE AI / PRIVATE CASE WORKSPACE", 9, "#16756d", 20);
  text(ctx.record.title, 28, "#123447", 12);
  text(`Case ID: ${ctx.record.id}\nCategory: ${ctx.record.category} | Status: ${ctx.record.status}\nPrepared: ${new Date().toISOString()}`, 9, "#526879", 20);
  title("Case summary");
  text(ctx.record.description || "No case description provided.");
  text("This bundle contains explicitly selected material. Reviewed status records a workspace review. It is not certification or a guarantee of court admissibility.", 9, "#526879", 16);
  const events = items.filter(i => i.kind === "timeline").sort((a, b) => (a.metadata.date || "9999").localeCompare(b.metadata.date || "9999"));
  if (events.length) {
    section("Confirmed chronology");
    for (const item of events) { title(`${item.metadata.date || "Date unknown"} - ${item.title}`); text(`${item.metadata.date_type || "unknown"} date | confirmed`, 8, "#526879"); text(item.content); source(item); }
  }
  const documents = items.filter(i => i.kind === "document");
  if (documents.length) {
    section("Selected document index");
    for (const item of documents) {
      title(item.title); text(`File: ${item.metadata.filename}\nVersion: ${item.version} | Uploaded: ${item.created_at}\nSize: ${item.metadata.size} bytes\nVersion ID: ${item.id}`, 9);
      text(`SHA-256: ${item.metadata.sha256}`, 8, "#526879", 18);
    }
    text("A matching fingerprint means that file bytes match the uploaded original. It does not establish authenticity or truthfulness. Original attachments are available separately in the selected ZIP export.", 9, "#526879");
  }
  const reviewed = items.filter(i => ["draft", "analysis", "chat", "note"].includes(i.kind));
  if (reviewed.length) {
    section("Reviewed material");
    for (const item of reviewed) {
      title(item.title); text(`${item.kind} | Version ${item.version} | Reviewed ${item.reviewed_at}\nReviewer: ${item.reviewer_id}\nVersion ID: ${item.id}`, 8, "#526879");
      text(item.content); if (item.metadata.review_comment) text(`Review comment: ${item.metadata.review_comment}`, 9, "#526879"); source(item);
    }
  }
  const tasks = items.filter(i => i.kind === "task");
  if (tasks.length) {
    section("Tasks and review status");
    for (const item of tasks) {
      title(`${item.metadata.completed ? "Completed" : "Outstanding"}: ${item.title}`); text(item.content);
      text(`Due date: ${item.metadata.due_date || "Not set"} | ${item.metadata.confirmation || "pending_review"}`, 9, "#526879"); source(item);
    }
  }
  const pages = doc.bufferedPageRange();
  for (let index = pages.start; index < pages.start + pages.count; index++) {
    doc.switchToPage(index);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font("NotoSans").fontSize(8).fillColor("#64748b");
    doc.text("Justice AI | Private case material", 50, doc.page.height - 40, { lineBreak: false, width: width - 80 });
    doc.text(`${index + 1} / ${pages.count}`, doc.page.width - 115, doc.page.height - 40, { lineBreak: false, width: 65, align: "right" });
    doc.page.margins.bottom = bottom;
  }
  doc.end();
  return result;
}

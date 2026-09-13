import type { CaseItem } from "@/types/cases";
import { activity, CaseContext, getItem } from "./server";
import { documentBytes } from "./documents";
import { CaseError, itemIds } from "./validation";
import { bundlePdf } from "./pdf";

export const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export async function selectedForExport(ctx: CaseContext, rawIds: unknown) {
  const ids = itemIds(rawIds);
  if (!ids.length) throw new CaseError(400, "Explicitly select material for your bundle.");
  const items: CaseItem[] = [];
  for (const id of ids) items.push(await getItem(ctx, id));
  for (const item of items) {
    if (item.metadata.source_item_id) await getItem(ctx, item.metadata.source_item_id);
    if (["draft", "analysis", "chat", "note"].includes(item.kind) && item.review_status !== "reviewed") throw new CaseError(409, `Review “${item.title}” version ${item.version} before including it in a reviewed bundle.`);
    if (item.kind === "timeline" && item.metadata.confirmation !== "confirmed") throw new CaseError(409, `Confirm “${item.title}” before including it in the chronology.`);
  }
  if (items.reduce((total, item) => total + item.content.length, 0) > 2_000_000) throw new CaseError(413, "This bundle is too large. Select fewer text records.");
  return items;
}
function source(item: CaseItem) {
  const m = item.metadata;
  if (!m.source_item_id) return "";
  return `<aside>Source version: <code>${escapeHtml(m.source_item_id)}</code>${m.source_page ? ` · page ${escapeHtml(m.source_page)}` : ""}${m.source_excerpt ? `<blockquote>${escapeHtml(m.source_excerpt)}</blockquote>` : ""}${m.assumptions ? `<p>Assumptions: ${escapeHtml(m.assumptions)}</p>` : ""}</aside>`;
}
export function bundleHtml(ctx: CaseContext, items: CaseItem[]) {
  const docs = items.filter(i => i.kind === "document");
  const events = items.filter(i => i.kind === "timeline").sort((a, b) => (a.metadata.date || "9999").localeCompare(b.metadata.date || "9999"));
  const tasks = items.filter(i => i.kind === "task");
  const materials = items.filter(i => ["draft", "analysis", "chat", "note"].includes(i.kind));
  const section = (title: string, inner: string) => inner ? `<section><h2>${title}</h2>${inner}</section>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(ctx.record.title)} — reviewed case bundle</title><style>
  @page { size:A4; margin:20mm 17mm; @bottom-right { content:counter(page); font-size:9pt; } }
  *{box-sizing:border-box}body{margin:0;background:#eef2f5;color:#172b3a;font:11pt/1.65 "Noto Sans","Nirmala UI","Kohinoor Devanagari","Lohit Devanagari",Arial,sans-serif}main{max-width:850px;margin:28px auto;background:white;padding:55px}header{border-bottom:3px solid #164e63;padding-bottom:24px}h1{font-size:28pt;line-height:1.2;margin:10px 0}h2{font-size:18pt;border-bottom:1px solid #cbd5e1;padding-bottom:8px}h3{font-size:13pt;margin-bottom:6px}section{break-before:page;margin-top:32px}article{margin:22px 0;break-inside:auto}h1,h2,h3{break-after:avoid}.meta,aside,small{font-size:9pt;color:#475569}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}code{overflow-wrap:anywhere;font-size:8pt}blockquote{border-left:2px solid #94a3b8;padding:0 12px;margin:8px 0;white-space:pre-wrap}table{border-collapse:collapse;width:100%;font-size:9pt}th,td{text-align:left;padding:8px;vertical-align:top;border-bottom:1px solid #ddd;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}.print-help{max-width:850px;margin:20px auto;padding:14px 20px;background:#dff2f3}footer{font-size:8pt;color:#64748b;border-top:1px solid #ddd;margin-top:30px;padding-top:10px}@media print{body{background:white}main{padding:0;margin:0;max-width:none}.print-help{display:none}a{color:inherit;text-decoration:none}}
  </style></head><body><div class="print-help">Use your browser’s Print command (Ctrl/Cmd + P) and choose <strong>Save as PDF</strong>. A4 pages, natural page breaks and your device’s Indian-language fonts are supported. Enable page numbers in the print dialog if your browser does not render them.</div><main>
  <header><div>JUSTICE AI · CASE BUNDLE</div><h1>${escapeHtml(ctx.record.title)}</h1><div class="meta">Case ID: ${escapeHtml(ctx.record.id)}<br>Prepared ${escapeHtml(new Date().toISOString())} · ${escapeHtml(ctx.record.category)} · ${escapeHtml(ctx.record.status)}</div></header>
  <h2>Case summary</h2><pre>${escapeHtml(ctx.record.description || "No case description provided.")}</pre><p class="meta">This bundle contains explicitly selected material. Reviewed status records a workspace review, not certification or a guarantee of court admissibility.</p>
  ${section("Confirmed chronology", events.map(e => `<article><h3>${escapeHtml(e.metadata.date || "Date unknown")} · ${escapeHtml(e.title)}</h3><div class="meta">${escapeHtml(e.metadata.date_type)} date · confirmed</div><pre>${escapeHtml(e.content)}</pre>${source(e)}</article>`).join(""))}
  ${section("Selected document index", docs.length ? `<table><thead><tr><th>Document</th><th>Version / uploaded</th><th>SHA-256 fingerprint</th></tr></thead><tbody>${docs.map(d => `<tr><td>${escapeHtml(d.title)}<br><small>${escapeHtml(d.metadata.filename)} · ${escapeHtml(d.metadata.size)} bytes</small></td><td>Version ${d.version}<br>${escapeHtml(d.created_at)}<br><code>${escapeHtml(d.id)}</code></td><td><code>${escapeHtml(d.metadata.sha256)}</code></td></tr>`).join("")}</tbody></table><p class="meta">A matching fingerprint means the bytes match the uploaded original. It does not establish authenticity or truthfulness. Original files are offered separately in the ZIP export.</p>` : "")}
  ${section("Reviewed material", materials.map(m => `<article><h3>${escapeHtml(m.title)}</h3><div class="meta">${escapeHtml(m.kind)} · version ${m.version} · reviewed ${escapeHtml(m.reviewed_at)} by ${escapeHtml(m.reviewer_id)}<br>Version ID: <code>${escapeHtml(m.id)}</code></div><pre>${escapeHtml(m.content)}</pre>${m.metadata.review_comment ? `<aside>Review comment: ${escapeHtml(m.metadata.review_comment)}</aside>` : ""}${source(m)}</article>`).join(""))}
  ${section("Tasks and review status", tasks.map(t => `<article><h3>${t.metadata.completed ? "Completed" : "Outstanding"}: ${escapeHtml(t.title)}</h3><pre>${escapeHtml(t.content)}</pre><div class="meta">Due date: ${escapeHtml(t.metadata.due_date || "Not set")} · ${escapeHtml(t.metadata.confirmation || "pending_review")}</div>${source(t)}</article>`).join(""))}
  <footer>Justice AI · Private case material · Review all dates, source references and legal content before use. Case material can contain sensitive information.</footer></main></body></html>`;
}

// ZIP STORE format: no compression dependency, UTF-8 filenames, CRC32 integrity.
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0;
});
export function zipFiles(files: { name: string; data: Uint8Array }[]): Buffer {
  const local: Buffer[] = [], central: Buffer[] = []; let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8"), data = Buffer.from(file.data);
    let crc = 0xffffffff; for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); crc = (crc ^ 0xffffffff) >>> 0;
    const head = Buffer.alloc(30); head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x800, 6); head.writeUInt32LE(crc, 14); head.writeUInt32LE(data.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(name.length, 26);
    local.push(head, name, data);
    const dir = Buffer.alloc(46); dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(0x800, 8); dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(data.length, 20); dir.writeUInt32LE(data.length, 24); dir.writeUInt16LE(name.length, 28); dir.writeUInt32LE(offset, 42);
    central.push(dir, name); offset += head.length + name.length + data.length;
  }
  const centralBuffer = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(centralBuffer.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralBuffer, end]);
}
export async function exportBundle(ctx: CaseContext, body: Record<string, unknown>) {
  if (body.format !== "html" && body.format !== "zip" && body.format !== "pdf") throw new CaseError(400, "Choose pdf, html (Print / Save PDF) or zip.");
  const items = await selectedForExport(ctx, body.itemIds);
  const html = bundleHtml(ctx, items);
  let data: Buffer, contentType: string, filename: string;
  if (body.format === "pdf") {
    data = await bundlePdf(ctx, items); contentType = "application/pdf"; filename = "justice-reviewed-case-bundle.pdf";
  } else if (body.format === "zip") {
    const docs = items.filter(i => i.kind === "document");
    const maxOriginalMB = process.env.VERCEL === "1" ? 3 : 50;
    const maxOriginalBytes = maxOriginalMB * 1024 * 1024;
    if (docs.reduce((size, doc) => size + Number(doc.metadata.size || 0), 0) > maxOriginalBytes) throw new CaseError(413, `Select at most ${maxOriginalMB} MB of original attachments per ZIP export on this host.`);
    const files = [{ name: "reviewed-case-bundle.html", data: Buffer.from(html) }];
    const manifest = [];
    let actualSize = 0;
    for (const doc of docs) {
      const { bytes } = await documentBytes(ctx, doc.id, true);
      actualSize += bytes.length;
      if (actualSize > maxOriginalBytes) throw new CaseError(413, "Attachment export is too large. Select fewer originals.");
      const name = `attachments/${doc.version}-${doc.id.slice(0, 8)}-${String(doc.metadata.filename).replace(/[\\/\x00-\x1f]/g, "_")}`;
      files.push({ name, data: Buffer.from(bytes) });
      manifest.push({ file: name, item_id: doc.id, version: doc.version, sha256: doc.metadata.sha256, bytes: bytes.length });
    }
    files.push({ name: "fingerprint-manifest.json", data: Buffer.from(JSON.stringify({ case_id: ctx.record.id, note: "Fingerprints compare uploaded bytes; they do not certify authenticity.", files: manifest }, null, 2)) });
    data = zipFiles(files); contentType = "application/zip"; filename = "justice-case-bundle.zip";
  } else { data = Buffer.from(html); contentType = "text/html; charset=utf-8"; filename = "justice-case-bundle.html"; }
  if (process.env.VERCEL === "1" && data.length > 4 * 1024 * 1024) throw new CaseError(413, "This bundle exceeds this host's download limit. Select fewer materials or download originals separately.");
  await activity(ctx, "reviewed_bundle_exported", "case", ctx.record.id);
  return new Response(new Uint8Array(data), { headers: { "Content-Type": contentType, "Content-Disposition": `attachment; filename="${filename}"`, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" } });
}

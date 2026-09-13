import { NextResponse } from "next/server";
import { context, db, getItem, publicItem, requirePermission, route } from "@/lib/cases/server";
import { documentBytes, readFile } from "@/lib/cases/documents";
import { CaseError, jsonBody, textField } from "@/lib/cases/validation";
import { proposeSourceFacts } from "@/lib/cases/permissions";
import { createItem } from "@/lib/cases/items";
import type { CaseItem } from "@/types/cases";
import { extractDocument, ExtractionError, getExtractionConfig } from "@/lib/extraction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = route(async (request, { params }) => {
  const ctx = await context(params.id);
  const { item, bytes } = await documentBytes(ctx, params.itemId, true);
  const disposition = new URL(request.url).searchParams.get("disposition") === "inline" ? "inline" : "attachment";
  const filename = String(item.metadata.filename || "document").replace(/[^\x20-\x7e]|["\\]/g, "_");
  return new Response(Buffer.from(bytes), { headers: {
    "Content-Type": String(item.metadata.mime_type || "application/octet-stream"),
    "Content-Disposition": `${disposition}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(String(item.metadata.filename || "document"))}`,
    "Content-Length": String(bytes.length), "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'",
  }});
});
export const POST = route(async (request, { params }) => {
  const ctx = await context(params.id);
  const item = await getItem(ctx, params.itemId);
  if (item.kind !== "document") throw new CaseError(400, "Choose a document version.");
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const { info } = await readFile(request);
    // Verify the stored bytes as well as comparing the candidate fingerprint.
    await documentBytes(ctx, item.id);
    const matches = info.sha256 === item.metadata.sha256;
    return NextResponse.json({ matches, storedSha256: item.metadata.sha256, uploadedSha256: info.sha256,
      message: matches ? "Matches uploaded original." : "Does not match the uploaded original. The file bytes differ." });
  }
  const body = await jsonBody(request);
  requirePermission(item.permission || null, "edit");
  if (body.action === "manual-text") {
    const text = textField(body.text, "Manual transcription", 500_000, true);
    const rows = await db<CaseItem>("justice_case_items", { id: `eq.${item.id}`, case_id: `eq.${ctx.record.id}` }, "PATCH", {
      metadata: { ...item.metadata, extracted_text: text, extraction_status: "manual", extraction_error: undefined, extraction_config: "manual-v1", extraction_method: "User-supplied transcription; compare with original" }, updated_by: ctx.user.id,
    });
    return NextResponse.json({ item: publicItem(rows[0]) });
  }
  if (body.action === "propose-timeline") {
    const text = item.metadata.extracted_text;
    if (!text) throw new CaseError(400, "Extract or enter document text before creating timeline proposals.");
    const existing = await db<CaseItem>("justice_case_items", { case_id: `eq.${ctx.record.id}`, source_item_id: `eq.${item.id}`, deleted_at: "is.null" });
    const proposals = proposeSourceFacts(text).filter(p => !existing.some(e => e.kind === p.kind && e.metadata.date === p.metadata.date && e.metadata.source_excerpt === p.metadata.source_excerpt));
    const items = [];
    for (const proposal of proposals) items.push(publicItem(await createItem(ctx, { ...proposal, metadata: { ...proposal.metadata, source_item_id: item.id } })));
    return NextResponse.json({ items, message: items.length ? `${items.length} source-linked date, party or action mentions added for review. No legal deadlines were calculated.` : "No new supported date, party or action mentions found. Existing proposals were retained." });
  }
  if (body.action === "extract") {
    const config = getExtractionConfig();
    if (item.metadata.extracted_text && item.metadata.extraction_status === "complete" && item.metadata.extraction_config === config && item.metadata.extraction_sha256 === item.metadata.sha256) {
      return NextResponse.json({ item: publicItem(item), cached: true });
    }
    const { bytes } = await documentBytes(ctx, item.id);
    try {
      const result = await extractDocument({ bytes, filename: String(item.metadata.filename), signal: request.signal, allowOCR: body.allowExternalProcessing === true });
      if (result.sha256 !== item.metadata.sha256) throw new CaseError(409, "Extraction fingerprint differs from the original.");
      const rows = await db<CaseItem>("justice_case_items", { id: `eq.${item.id}`, case_id: `eq.${ctx.record.id}` }, "PATCH", {
        metadata: { ...item.metadata, extracted_text: result.text, extraction_pages: result.pages, extraction_config: result.config,
          extraction_sha256: result.sha256, extraction_method: result.method, extraction_status: "complete", extraction_error: undefined }, updated_by: ctx.user.id,
      });
      return NextResponse.json({ item: publicItem(rows[0]), cached: false });
    } catch (error) {
      if (error instanceof CaseError) throw error;
      const message = error instanceof ExtractionError ? error.message : "Extraction could not finish. Retry or enter a manual transcription. Your original is retained.";
      const rows = await db<CaseItem>("justice_case_items", { id: `eq.${item.id}`, case_id: `eq.${ctx.record.id}` }, "PATCH", {
        metadata: { ...item.metadata, extraction_status: "failed", extraction_error: message }, updated_by: ctx.user.id,
      });
      return NextResponse.json({ error: message, code: error instanceof ExtractionError ? error.code : "EXTRACTION_FAILED", retryable: error instanceof ExtractionError ? error.retryable : true, item: publicItem(rows[0]) }, { status: error instanceof ExtractionError ? error.status : 502 });
    }
  }
  throw new CaseError(400, "Choose extract, manual-text or propose-timeline, or upload a file to compare.");
});

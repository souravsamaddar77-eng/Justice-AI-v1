import { randomUUID } from "node:crypto";
import type { CaseItem, CaseItemKind, CaseItemMetadata, ReviewStatus } from "@/types/cases";
import { CaseContext, db, getItem, requirePermission } from "./server";
import { CaseError, textField, uuid } from "./validation";
import { validateSource } from "./permissions";

const kinds: CaseItemKind[] = ["chat", "analysis", "draft", "timeline", "task", "note"];
const reviewStates: ReviewStatus[] = ["ai_draft", "needs_review", "changes_requested", "reviewed"];
function dateField(value: unknown, name: string) {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new CaseError(400, `${name} must be a calendar date (YYYY-MM-DD).`);
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new CaseError(400, `${name} is not a valid date.`);
  return value;
}
export async function cleanMetadata(ctx: CaseContext, kind: CaseItemKind, input: unknown): Promise<CaseItemMetadata> {
  if (input !== undefined && (!input || typeof input !== "object" || Array.isArray(input))) throw new CaseError(400, "Metadata must be an object.");
  const value = (input || {}) as Record<string, unknown>;
  const result: CaseItemMetadata = {};
  for (const field of ["tool", "assumptions", "source", "origin", "provider", "model", "urgency", "deadline_source"] as const) {
    if (value[field] !== undefined) result[field] = textField(value[field], field, 2000);
  }
  if (value.source === "mock" || value.source === "demo" || value.origin === "demo") throw new CaseError(400, "Demo results cannot be saved as real case material. Run a live analysis or add clearly identified personal notes.");
  if (value.deadline_date !== undefined) {
    // Saved analysis dates stay suggestions until separately confirmed in a task.
    result.deadline_date = dateField(value.deadline_date, "Suggested deadline date");
    result.deadline_status = "unconfirmed";
  }
  if (value.ai && typeof value.ai === "object" && !Array.isArray(value.ai)) {
    const ai = value.ai as Record<string, unknown>;
    result.ai = {
      ...(ai.provider !== undefined ? { provider: textField(ai.provider, "Provider", 80) } : {}),
      ...(ai.model !== undefined ? { model: textField(ai.model, "Model", 200) } : {}),
      fallback: ai.fallback === true,
      ...(Number.isInteger(ai.attempts) && Number(ai.attempts) >= 0 && Number(ai.attempts) <= 20 ? { attempts: Number(ai.attempts) } : {}),
    };
  }
  if (value.source_item_id) {
    result.source_item_id = uuid(value.source_item_id, "source version ID");
    result.source_excerpt = textField(value.source_excerpt, "Supporting excerpt", 4000, true);
    const source = await getItem(ctx, result.source_item_id);
    if (!validateSource(source, result)) throw new CaseError(400, "The supporting excerpt must occur in the extracted text of the selected document version.");
    if (value.source_page !== undefined) {
      if (!Number.isInteger(value.source_page) || Number(value.source_page) < 1 || Number(value.source_page) > 10000) throw new CaseError(400, "Invalid source page.");
      result.source_page = Number(value.source_page);
    }
  }
  if (kind === "timeline") {
    if (!result.source_item_id) throw new CaseError(400, "Timeline events require a source document version and supporting excerpt.");
    result.date = dateField(value.date, "Event date");
    result.date_type = ["explicit", "inferred", "unknown"].includes(String(value.date_type)) ? value.date_type as "explicit" | "inferred" | "unknown" : "unknown";
    if (result.date_type === "unknown") result.date = null;
    if (result.date_type !== "unknown" && !result.date) throw new CaseError(400, "An explicit or inferred event needs a date.");
    result.confirmation = value.confirmation === "confirmed" ? "confirmed" : "pending_review";
    if (value.parties !== undefined) {
      if (!Array.isArray(value.parties) || value.parties.length > 30) throw new CaseError(400, "Select up to 30 parties.");
      result.parties = value.parties.map(v => textField(v, "Party", 200, true));
    }
  }
  if (kind === "task") {
    result.completed = value.completed === true;
    result.due_date = dateField(value.due_date, "Due date");
    result.confirmation = value.confirmation === "confirmed" ? "confirmed" : "pending_review";
  }
  return result;
}
export async function createItem(ctx: CaseContext, body: Record<string, unknown>): Promise<CaseItem> {
  const kind = body.kind as CaseItemKind;
  if (!kinds.includes(kind)) throw new CaseError(400, "Choose a supported material type. Documents use the upload endpoint.");
  requirePermission(ctx.permission, kind === "note" ? "comment" : "edit");
  const title = textField(body.title, "Title", 200, true);
  const content = textField(body.content, "Content", 500_000);
  const metadata = await cleanMetadata(ctx, kind, body.metadata);
  const reviewStatus = body.review_status === "ai_draft" ? "ai_draft" : "needs_review";
  const rows = await db<CaseItem>("justice_case_items", {}, "POST", {
    case_id: ctx.record.id, resource_id: randomUUID(), kind, title, content, metadata,
    review_status: reviewStatus, created_by: ctx.user.id, updated_by: ctx.user.id,
  });
  return rows[0];
}
export async function changeItem(ctx: CaseContext, itemId: string, body: Record<string, unknown>) {
  const item = await getItem(ctx, itemId, body.action === "review" ? "comment" : "edit");
  if (body.action === "delete") {
    // Keep source versions referenced by chronology readable and preserve history.
    const refs = await db<CaseItem>("justice_case_items", { case_id: `eq.${ctx.record.id}`, source_item_id: `eq.${item.id}`, deleted_at: "is.null", limit: "1" });
    if (refs.length) throw new CaseError(409, "This document version is referenced by case material. Remove those references before removing it.");
    const rows = await db<CaseItem>("justice_case_items", { id: `eq.${item.id}`, case_id: `eq.${ctx.record.id}` }, "PATCH", { deleted_at: new Date().toISOString(), updated_by: ctx.user.id });
    return rows[0];
  }
  if (body.action === "review") {
    if (!reviewStates.includes(body.review_status as ReviewStatus)) throw new CaseError(400, "Choose a valid review state.");
    if (body.review_status === "reviewed" || body.review_status === "ai_draft") requirePermission(item.permission, "edit");
    const comment = textField(body.comment, "Review comment", 10_000);
    const rows = await db<CaseItem>("justice_case_items", { id: `eq.${item.id}`, case_id: `eq.${ctx.record.id}` }, "PATCH", {
      review_status: body.review_status, reviewer_id: ctx.user.id, reviewed_at: new Date().toISOString(),
      metadata: { ...item.metadata, review_comment: comment }, updated_by: ctx.user.id,
    });
    return rows[0];
  }
  if (body.action !== "update") throw new CaseError(400, "Choose update, review or delete.");
  if (item.kind === "document") throw new CaseError(400, "Upload a new document version to change the original file.");
  const title = body.title === undefined ? item.title : textField(body.title, "Title", 200, true);
  const content = body.content === undefined ? item.content : textField(body.content, "Content", 500_000);
  const metadata = await cleanMetadata(ctx, item.kind, body.metadata === undefined ? item.metadata : body.metadata);
  if (item.kind === "timeline" || item.kind === "task") {
    const rows = await db<CaseItem>("justice_case_items", { id: `eq.${item.id}`, case_id: `eq.${ctx.record.id}` }, "PATCH", {
      title, content, metadata, review_status: "needs_review", reviewer_id: null, reviewed_at: null, updated_by: ctx.user.id,
    });
    return rows[0];
  }
  const versions = await db<CaseItem>("justice_case_items", { case_id: `eq.${ctx.record.id}`, resource_id: `eq.${item.resource_id}`, order: "version.desc", limit: "1" });
  const rows = await db<CaseItem>("justice_case_items", {}, "POST", {
    case_id: ctx.record.id, resource_id: item.resource_id, version: versions[0].version + 1,
    kind: item.kind, title, content, metadata, review_status: "needs_review",
    created_by: ctx.user.id, updated_by: ctx.user.id,
  });
  return rows[0];
}

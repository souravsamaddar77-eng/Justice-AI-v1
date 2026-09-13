import { randomUUID } from "node:crypto";
import type { CaseItem } from "@/types/cases";
import { activity, CaseContext, db, getItem, requirePermission, storage, visibleItems } from "./server";
import { CaseError, fingerprint, MAX_FILE_SIZE, textField, uuid, validateFile } from "./validation";

export async function readFile(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_FILE_SIZE + 64_000) throw new CaseError(413, "Upload a file up to 3 MB.");
  let form: FormData;
  try { form = await request.formData(); } catch { throw new CaseError(400, "Send a multipart upload with a file field."); }
  const file = form.get("file");
  if (!file || typeof file === "string" || !file.size || file.size > MAX_FILE_SIZE) throw new CaseError(400, "Upload a non-empty file up to 3 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const info = validateFile(bytes, file.name);
  return { form, bytes, info };
}
export async function uploadDocument(ctx: CaseContext, request: Request) {
  requirePermission(ctx.permission, "edit");
  const { form, bytes, info } = await readFile(request);
  const id = randomUUID();
  const resourceInput = form.get("resourceId");
  let resourceId: string = randomUUID();
  let version = 1;
  if (resourceInput) {
    resourceId = uuid(resourceInput, "document resource ID");
    const visible = (await visibleItems(ctx)).filter(i => i.resource_id === resourceId && i.kind === "document").sort((a, b) => b.version - a.version);
    if (!visible[0]) throw new CaseError(404, "Document not found.");
    requirePermission(visible[0].permission || null, "edit");
    const versions = await db<CaseItem>("justice_case_items", { case_id: `eq.${ctx.record.id}`, resource_id: `eq.${resourceId}`, order: "version.desc", limit: "1" });
    version = versions[0].version + 1;
  }
  const storagePath = `${ctx.record.id}/${resourceId}/${id}`;
  // Immutable unique path and upsert=false preserve every uploaded original.
  await storage(storagePath, { method: "POST", headers: { "Content-Type": info.mime, "x-upsert": "false" }, body: Buffer.from(bytes) });
  try {
    const extractedText = info.mime === "text/plain" ? new TextDecoder().decode(bytes) : undefined;
    const rows = await db<CaseItem>("justice_case_items", {}, "POST", {
      id, case_id: ctx.record.id, resource_id: resourceId, version, kind: "document",
      title: textField(form.get("title") || info.filename, "Title", 200, true), content: "",
      metadata: { filename: info.filename, mime_type: info.mime, size: bytes.length, sha256: info.sha256, storage_path: storagePath,
        extraction_status: extractedText !== undefined ? "complete" : "pending", ...(extractedText !== undefined ? { extracted_text: extractedText.slice(0, 500_000), extraction_config: "utf8-v1", extraction_method: "UTF-8 text" } : {}) },
      review_status: "needs_review", created_by: ctx.user.id, updated_by: ctx.user.id,
    });
    return rows[0];
  } catch (error) {
    // A failed DB insert must not leave an accessible phantom upload.
    await storage(storagePath, { method: "DELETE" }).catch(() => undefined);
    throw error;
  }
}
export async function documentBytes(ctx: CaseContext, itemId: string, logDownload = false) {
  const item = await getItem(ctx, itemId);
  if (item.kind !== "document" || typeof item.metadata.storage_path !== "string") throw new CaseError(404, "Document not found.");
  const response = await storage(item.metadata.storage_path);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (fingerprint(bytes) !== item.metadata.sha256) throw new CaseError(409, "Stored file fingerprint does not match the uploaded original. Download stopped; contact the workspace administrator.", "FINGERPRINT_MISMATCH");
  if (logDownload) await activity(ctx, "document_downloaded", "document", item.id);
  return { item, bytes };
}

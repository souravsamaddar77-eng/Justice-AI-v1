import { createHash } from "node:crypto";

export class CaseError extends Error {
  constructor(public status: number, message: string, public code = "CASE_ERROR") { super(message); }
}
export function uuid(value: unknown, field = "ID"): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new CaseError(400, `Invalid ${field}.`);
  return value.toLowerCase();
}
export function textField(value: unknown, field: string, max: number, required = false): string {
  if (value === undefined && !required) return "";
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new CaseError(400, `${field} must be ${required ? "non-empty text" : "text"} of at most ${max} characters.`);
  return value.trim();
}
export function emailField(value: unknown): string {
  const email = textField(value, "Email", 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CaseError(400, "Enter a valid email address.");
  return email;
}
export function itemIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 100) throw new CaseError(400, "Select up to 100 material versions.");
  return Array.from(new Set(value.map(v => uuid(v, "material ID"))));
}
export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length")) > 1_000_000) throw new CaseError(413, "Request is too large.");
  const raw = await request.text();
  if (raw.length > 1_000_000) throw new CaseError(413, "Request is too large.");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { throw new CaseError(400, "Send a valid JSON object."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new CaseError(400, "Send a valid JSON object.");
  return body as Record<string, unknown>;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const target = new URL(request.url).origin;
  const configured = process.env.APP_URL ? new URL(process.env.APP_URL).origin : target;
  if (origin && origin !== target && origin !== configured) throw new CaseError(403, "Cross-origin request rejected.");
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new CaseError(403, "Cross-site request rejected.");
}
export function fingerprint(bytes: Uint8Array) { return createHash("sha256").update(bytes).digest("hex"); }
// Leaves room for multipart/JSON encoding within hosted function body limits.
export const MAX_FILE_SIZE = 3 * 1024 * 1024;
export function validateFile(bytes: Uint8Array, filename: string) {
  if (!bytes.length || bytes.length > MAX_FILE_SIZE) throw new CaseError(400, "Upload a non-empty file up to 3 MB.");
  if (!filename || filename.length > 180 || /[\x00-\x1f\x7f\\/]/.test(filename) || filename === "." || filename === "..") throw new CaseError(400, "Use a filename without path separators or control characters (up to 180 characters).");
  const ext = filename.split(".").pop()?.toLowerCase();
  const prefix = Buffer.from(bytes.slice(0, 16));
  let mime: string | null = null;
  if (prefix.subarray(0, 5).toString() === "%PDF-" && ext === "pdf") mime = "application/pdf";
  if (prefix.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && ext === "png") mime = "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && (ext === "jpg" || ext === "jpeg")) mime = "image/jpeg";
  if (ext === "txt") {
    try {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(decoded)) mime = "text/plain";
    } catch { /* Binary input is not a text document. */ }
  }
  if (!mime) throw new CaseError(415, "Supported files: PDF, PNG, JPEG and UTF-8 TXT. File contents must match the extension.");
  return { mime, sha256: fingerprint(bytes), filename };
}

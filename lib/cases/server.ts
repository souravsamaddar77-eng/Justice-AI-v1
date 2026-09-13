import "server-only";
import { NextResponse } from "next/server";
import type { CaseActivity, CaseDetail, CaseInvitation, CaseItem, CasePermission, CaseRecord, CaseReview, CaseUser } from "@/types/cases";
import { casePermission, itemPermission, permits } from "./permissions";
import { CaseError, sameOrigin, uuid } from "./validation";
import { getServerSupabaseConfig } from "@/utils/supabase/server-config";
import { authConfigured, getAuthIdentity, type AuthIdentity } from "@/lib/auth/clerk";
export { AUTH_SETUP_MESSAGE, authConfigured } from "@/lib/auth/clerk";

export const SETUP_MESSAGE = "Private cases need Clerk sign-in, Supabase URL/public key, a server-only SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY), and both SQL files in supabase/migrations (case storage and Clerk account mapping). Standalone tools remain available.";
export const BUCKET = "justice-case-documents";
export function configured() { return authConfigured() && !!getServerSupabaseConfig() && !!(process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()); }
export function config() {
  if (!configured()) throw new CaseError(503, SETUP_MESSAGE, "SETUP_REQUIRED");
  const { url, key } = getServerSupabaseConfig()!;
  return { url, anon: key, service: (process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())! };
}

function serviceHeaders(service: string) {
  // Modern secret keys are not JWTs. Only legacy service_role JWTs belong in Bearer.
  return { apikey: service, ...(!service.startsWith("sb_secret_") ? { Authorization: `Bearer ${service}` } : {}) };
}
export async function currentUser(required = true): Promise<CaseUser | null> {
  const identity = await getAuthIdentity(required);
  if (!identity) return null;
  if (!configured()) {
    if (required) config();
    // Account controls can still identify the user before storage is configured.
    return { id: identity.subject, email: identity.email };
  }
  return resolveCaseAccount(identity);
}

type Table = "justice_accounts" | "justice_cases" | "justice_case_items" | "justice_case_invitations" | "justice_case_activity" | "justice_case_reviews";
export async function db<T>(table: Table, query: Record<string, string> = {}, method = "GET", body?: unknown): Promise<T[]> {
  const { url, service } = config();
  let response: Response;
  try {
    response = await fetch(`${url}/rest/v1/${table}?${new URLSearchParams(query)}`, {
      method, cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { ...serviceHeaders(service), "Content-Type": "application/json", Prefer: "return=representation" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch { throw new CaseError(503, "Case storage is unavailable. Your input has not been discarded.", "STORAGE_UNAVAILABLE"); }
  if (!response.ok) {
    if (response.status === 409) throw new CaseError(409, "This record changed or already exists. Refresh the case and try again.");
    const error = await response.json().catch(() => ({}));
    if (error.code === "42P01" || error.code === "PGRST205") throw new CaseError(503, SETUP_MESSAGE, "SETUP_REQUIRED");
    throw new CaseError(503, "Case storage could not complete this request. Check the database migration and retry.", "STORAGE_ERROR");
  }
  if (response.status === 204) return [];
  return await response.json() as T[];
}

interface CaseAccount { id: string; clerk_user_id: string | null; supabase_user_id: string | null }
async function resolveCaseAccount(identity: AuthIdentity): Promise<CaseUser> {
  const find = () => db<CaseAccount>("justice_accounts", { clerk_user_id: `eq.${identity.subject}`, limit: "1" });
  let [account] = await find();
  if (!account) {
    try {
      if (identity.legacyUserId) {
        const [legacy] = await db<CaseAccount>("justice_accounts", { supabase_user_id: `eq.${identity.legacyUserId}`, limit: "1" });
        if (!legacy || legacy.clerk_user_id) throw new CaseError(409, "The imported account link needs administrator review.");
        [account] = await db<CaseAccount>("justice_accounts", { id: `eq.${legacy.id}`, clerk_user_id: "is.null" }, "PATCH", { clerk_user_id: identity.subject });
        if (!account) [account] = await find();
      } else {
        [account] = await db<CaseAccount>("justice_accounts", {}, "POST", { clerk_user_id: identity.subject });
      }
    } catch (error) {
      if (!(error instanceof CaseError) || error.status !== 409) throw error;
      // Parallel first requests can race on the unique Clerk subject. Re-read
      // only that subject; never match accounts by email or user metadata.
      [account] = await find();
      if (!account) throw error;
    }
  }
  if (!account) throw new CaseError(409, "Your account link changed. Refresh and retry.");
  return { id: uuid(account.id, "account ID"), email: identity.email };
}

export interface CaseContext { user: CaseUser; record: CaseRecord; grants: CaseInvitation[]; permission: CasePermission }
export async function context(caseId: string): Promise<CaseContext> {
  const id = uuid(caseId, "case ID");
  const user = (await currentUser())!;
  const records = await db<CaseRecord>("justice_cases", { id: `eq.${id}`, limit: "1" });
  if (!records[0]) throw new CaseError(404, "Case not found.");
  const grants = await db<CaseInvitation>("justice_case_invitations", { case_id: `eq.${id}`, status: "eq.accepted" });
  const permission = casePermission(records[0], grants, user.id);
  if (!permission) throw new CaseError(404, "Case not found.");
  return { user, record: records[0], grants, permission };
}
export function requirePermission(permission: CasePermission | null, required: "read" | "comment" | "edit" | "owner") {
  if (!permits(permission, required)) throw new CaseError(403, "You do not have permission for this action.");
}
export async function visibleItems(ctx: CaseContext) {
  const rows = await db<CaseItem>("justice_case_items", { case_id: `eq.${ctx.record.id}`, deleted_at: "is.null", order: "created_at.desc" });
  return rows.flatMap(item => {
    const permission = itemPermission(ctx.record, ctx.grants, ctx.user.id, item);
    return permission ? [{ ...item, permission }] : [];
  });
}
export async function getItem(ctx: CaseContext, itemId: string, required: "read" | "comment" | "edit" = "read") {
  const id = uuid(itemId, "material ID");
  const rows = await db<CaseItem>("justice_case_items", { id: `eq.${id}`, case_id: `eq.${ctx.record.id}`, deleted_at: "is.null", limit: "1" });
  const item = rows[0];
  const permission = item && itemPermission(ctx.record, ctx.grants, ctx.user.id, item);
  if (!permission) throw new CaseError(404, "Material not found or not shared with you.");
  requirePermission(permission, required);
  return { ...item, permission };
}
export function publicItem(item: CaseItem): CaseItem {
  const { storage_path: _storage, ...metadata } = item.metadata;
  return { ...item, metadata };
}
export async function detail(ctx: CaseContext): Promise<CaseDetail> {
  const items = await visibleItems(ctx);
  const ids = new Set(items.map(i => i.id));
  const invites = ctx.permission === "owner"
    ? await db<CaseInvitation>("justice_case_invitations", { case_id: `eq.${ctx.record.id}`, order: "created_at.desc" })
    : ctx.grants.filter(g => g.accepted_by === ctx.user.id);
  const activity = await db<CaseActivity>("justice_case_activity", { case_id: `eq.${ctx.record.id}`, order: "created_at.desc", limit: "200" });
  const reviews = await db<CaseReview>("justice_case_reviews", { case_id: `eq.${ctx.record.id}`, order: "created_at.desc", limit: "500" });
  return {
    case: { ...ctx.record, permission: ctx.permission }, items: items.map(publicItem), permission: ctx.permission,
    invitations: invites, members: invites.filter(g => g.status === "accepted"),
    activity: ctx.permission === "owner" ? activity : activity.filter(a => a.object_type === "case" || ids.has(a.object_id) || a.actor_id === ctx.user.id),
    reviews: reviews.filter(review => ids.has(review.item_id)),
  };
}
export async function activity(ctx: CaseContext, action: string, objectType: string, objectId: string) {
  await db("justice_case_activity", {}, "POST", { case_id: ctx.record.id, actor_id: ctx.user.id, action, object_type: objectType, object_id: objectId });
}
export async function storage(path: string, init: RequestInit = {}) {
  const { url, service } = config();
  let response: Response;
  try {
    response = await fetch(`${url}/storage/v1/object/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`, {
      ...init, cache: "no-store", signal: AbortSignal.timeout(30_000),
      headers: { ...serviceHeaders(service), ...init.headers },
    });
  } catch { throw new CaseError(503, "Private file storage is unavailable. Please retry."); }
  if (!response.ok) throw new CaseError(503, "Private file storage could not complete this request. Check the private bucket setup.");
  return response;
}
export function route(fn: (request: Request, args: { params: Record<string, string> }) => Promise<Response>) {
  return async (request: Request, args: { params: Promise<Record<string, string>> }) => {
    try {
      if (!["GET", "HEAD"].includes(request.method)) sameOrigin(request);
      const response = await fn(request, { params: await args?.params || {} });
      response.headers.set("Cache-Control", "private, no-store, max-age=0");
      response.headers.set("Vary", "Cookie");
      return response;
    } catch (error) {
      const known = error instanceof CaseError;
      return NextResponse.json({ error: known ? error.message : "The request could not be completed. Please retry.", code: known ? error.code : "INTERNAL_ERROR" }, {
        status: known ? error.status : 500, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
      });
    }
  };
}

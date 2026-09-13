import { NextResponse } from "next/server";
import { context, db, requirePermission, route, visibleItems } from "@/lib/cases/server";
import { CaseError, emailField, itemIds, jsonBody, uuid } from "@/lib/cases/validation";
import type { CaseInvitation } from "@/types/cases";

export const POST = route(async (request, { params }) => {
  const ctx = await context(params.id);
  requirePermission(ctx.permission, "owner");
  const body = await jsonBody(request);
  const email = emailField(body.email);
  if (email === ctx.user.email) throw new CaseError(400, "You already own this case.");
  if (!["read", "comment", "edit"].includes(String(body.permission))) throw new CaseError(400, "Choose read, comment or edit access.");
  const selected = itemIds(body.itemIds);
  const visible = await visibleItems(ctx);
  if (selected.some(id => !visible.some(item => item.id === id))) throw new CaseError(400, "Choose material from this case.");
  const rows = await db<CaseInvitation>("justice_case_invitations", {}, "POST", {
    case_id: ctx.record.id, email, permission: body.permission, item_ids: selected,
    invited_by: ctx.user.id, updated_by: ctx.user.id,
  });
  return NextResponse.json({ invitation: rows[0], message: "Invitation created. It appears in the recipient's authenticated case workspace. No email has been sent. Access covers the case summary and selected versions only." }, { status: 201 });
});
export const PATCH = route(async (request, { params }) => {
  const ctx = await context(params.id);
  requirePermission(ctx.permission, "owner");
  const body = await jsonBody(request);
  if (body.action !== "revoke") throw new CaseError(400, "Choose revoke.");
  const id = uuid(body.id, "invitation ID");
  const rows = await db<CaseInvitation>("justice_case_invitations", { id: `eq.${id}`, case_id: `eq.${ctx.record.id}`, status: "in.(pending,accepted)" }, "PATCH", { status: "revoked", updated_by: ctx.user.id });
  if (!rows[0]) throw new CaseError(404, "Active invitation not found.");
  return NextResponse.json({ invitation: rows[0], message: "Future access through this invitation has been revoked. Already downloaded files cannot be recalled." });
});

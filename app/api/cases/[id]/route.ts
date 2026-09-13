import { NextResponse } from "next/server";
import { context, db, detail, requirePermission, route } from "@/lib/cases/server";
import { CaseError, jsonBody, textField } from "@/lib/cases/validation";
import type { CaseRecord } from "@/types/cases";

export const dynamic = "force-dynamic";
export const GET = route(async (_request, { params }) => NextResponse.json(await detail(await context(params.id))));
export const PATCH = route(async (request, { params }) => {
  const ctx = await context(params.id);
  requirePermission(ctx.permission, "owner");
  const body = await jsonBody(request);
  const changes: Record<string, unknown> = { updated_by: ctx.user.id };
  if (body.title !== undefined) changes.title = textField(body.title, "Title", 160, true);
  if (body.description !== undefined) changes.description = textField(body.description, "Description", 10_000);
  if (body.category !== undefined) changes.category = textField(body.category, "Category", 80, true);
  if (body.status !== undefined) {
    if (!["open", "in_progress", "resolved", "archived"].includes(String(body.status))) throw new CaseError(400, "Invalid case status.");
    changes.status = body.status;
  }
  const rows = await db<CaseRecord>("justice_cases", { id: `eq.${ctx.record.id}`, owner_id: `eq.${ctx.user.id}` }, "PATCH", changes);
  return NextResponse.json({ case: rows[0] });
});

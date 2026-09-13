import { NextResponse } from "next/server";
import { currentUser, db, route } from "@/lib/cases/server";
import { CaseError, jsonBody, textField } from "@/lib/cases/validation";
import type { CaseInvitation, CaseRecord } from "@/types/cases";
import { casePermission } from "@/lib/cases/permissions";

export const dynamic = "force-dynamic";
export const GET = route(async request => {
  const user = (await currentUser())!;
  const grants = await db<CaseInvitation>("justice_case_invitations", { accepted_by: `eq.${user.id}`, status: "eq.accepted" });
  const ids = Array.from(new Set(grants.map(g => g.case_id)));
  const records = await db<CaseRecord>("justice_cases", {
    ...(ids.length ? { or: `(owner_id.eq.${user.id},id.in.(${ids.join(",")}))` } : { owner_id: `eq.${user.id}` }),
    order: "updated_at.desc", limit: "500",
  });
  const query = new URL(request.url).searchParams;
  const search = (query.get("q") || "").slice(0, 200).toLowerCase();
  const status = query.get("status");
  return NextResponse.json({ cases: records.filter(c => (!search || `${c.title} ${c.description} ${c.category}`.toLowerCase().includes(search)) && (!status || status === "all" || c.status === status)).map(c => ({ ...c, permission: casePermission(c, grants, user.id) })) });
});
export const POST = route(async request => {
  const user = (await currentUser())!;
  const body = await jsonBody(request);
  const title = textField(body.title, "Title", 160, true);
  const description = textField(body.description, "Description", 10_000);
  const category = textField(body.category, "Category", 80) || "General";
  if (body.status && !["open", "in_progress", "resolved", "archived"].includes(String(body.status))) throw new CaseError(400, "Invalid case status.");
  const rows = await db<CaseRecord>("justice_cases", {}, "POST", { title, description, category, status: body.status || "open", owner_id: user.id, updated_by: user.id });
  return NextResponse.json({ case: rows[0] }, { status: 201 });
});

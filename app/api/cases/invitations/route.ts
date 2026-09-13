import { NextResponse } from "next/server";
import { currentUser, db, route } from "@/lib/cases/server";
import { CaseError, jsonBody, uuid } from "@/lib/cases/validation";
import type { CaseInvitation, CaseRecord } from "@/types/cases";

export const dynamic = "force-dynamic";
export const GET = route(async () => {
  const user = (await currentUser())!;
  const rows = await db<CaseInvitation>("justice_case_invitations", { email: `eq.${user.email}`, status: "in.(pending,accepted)", order: "created_at.desc" });
  const ids = Array.from(new Set(rows.map(row => row.case_id)));
  const records = ids.length ? await db<CaseRecord>("justice_cases", { id: `in.(${ids.join(",")})`, select: "id,title" }) : [];
  return NextResponse.json({ invitations: rows.map(row => ({ ...row, case_title: records.find(c => c.id === row.case_id)?.title || "Shared case" })) });
});
export const POST = route(async request => {
  const user = (await currentUser())!;
  const body = await jsonBody(request);
  const id = uuid(body.id, "invitation ID");
  if (body.action !== "accept" && body.action !== "decline") throw new CaseError(400, "Choose accept or decline.");
  const rows = await db<CaseInvitation>("justice_case_invitations", { id: `eq.${id}`, email: `eq.${user.email}`, status: "eq.pending" }, "PATCH", {
    status: body.action === "accept" ? "accepted" : "declined", accepted_by: body.action === "accept" ? user.id : null, updated_by: user.id,
  });
  if (!rows[0]) throw new CaseError(404, "Pending invitation not found for your verified email address.");
  return NextResponse.json({ invitation: rows[0] });
});

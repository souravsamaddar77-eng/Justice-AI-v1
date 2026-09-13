import { activity, context, getItem, route } from "@/lib/cases/server";
import { CaseError } from "@/lib/cases/validation";

export const dynamic = "force-dynamic";
export const GET = route(async (_request, { params }) => {
  const ctx = await context(params.id);
  const item = await getItem(ctx, params.itemId);
  if (item.kind === "document") throw new CaseError(400, "Use the original document download action.");
  await activity(ctx, "material_downloaded", item.kind, item.id);
  const text = `JUSTICE AI\n${item.title}\n${item.kind} · version ${item.version}\nReview status: ${item.review_status.replace(/_/g, " ")}\nVersion ID: ${item.id}\n${item.reviewed_at ? `Review recorded: ${item.reviewed_at}\nReviewer: ${item.reviewer_id}\n` : "This version has not been reviewed.\n"}\n${item.content}\n`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="justice-${item.kind}-v${item.version}.txt"`, "X-Content-Type-Options": "nosniff" } });
});

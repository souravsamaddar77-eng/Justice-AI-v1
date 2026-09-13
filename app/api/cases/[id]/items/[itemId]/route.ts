import { NextResponse } from "next/server";
import { context, publicItem, route } from "@/lib/cases/server";
import { jsonBody } from "@/lib/cases/validation";
import { changeItem } from "@/lib/cases/items";

export const PATCH = route(async (request, { params }) => {
  const ctx = await context(params.id);
  return NextResponse.json({ item: publicItem(await changeItem(ctx, params.itemId, await jsonBody(request))) });
});

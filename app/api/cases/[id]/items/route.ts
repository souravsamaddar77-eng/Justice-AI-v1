import { NextResponse } from "next/server";
import { context, publicItem, route } from "@/lib/cases/server";
import { jsonBody } from "@/lib/cases/validation";
import { createItem } from "@/lib/cases/items";

export const POST = route(async (request, { params }) => {
  const ctx = await context(params.id);
  return NextResponse.json({ item: publicItem(await createItem(ctx, await jsonBody(request))) }, { status: 201 });
});

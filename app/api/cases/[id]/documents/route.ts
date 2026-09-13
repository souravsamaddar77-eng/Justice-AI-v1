import { NextResponse } from "next/server";
import { context, publicItem, route } from "@/lib/cases/server";
import { uploadDocument } from "@/lib/cases/documents";

export const runtime = "nodejs";
export const POST = route(async (request, { params }) => NextResponse.json({ item: publicItem(await uploadDocument(await context(params.id), request)) }, { status: 201 }));

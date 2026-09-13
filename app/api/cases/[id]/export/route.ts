import { context, route } from "@/lib/cases/server";
import { jsonBody } from "@/lib/cases/validation";
import { exportBundle } from "@/lib/cases/export";

export const runtime = "nodejs";
export const POST = route(async (request, { params }) => exportBundle(await context(params.id), await jsonBody(request)));

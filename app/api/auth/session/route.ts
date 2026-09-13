import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { authConfigured, configured, currentUser, route, SETUP_MESSAGE, AUTH_SETUP_MESSAGE } from "@/lib/cases/server";
import { CaseError, jsonBody } from "@/lib/cases/validation";

export const dynamic = "force-dynamic";
function status() {
  return {
    provider: "clerk", configured: configured(), authConfigured: authConfigured(),
    ...(!configured() ? { setupMessage: authConfigured() ? SETUP_MESSAGE : AUTH_SETUP_MESSAGE } : {}),
  };
}
export const GET = route(async () => NextResponse.json({ ...status(), user: await currentUser(false) }));
export const POST = route(async request => {
  const body = await jsonBody(request);
  if (body.action !== "signout") throw new CaseError(409, "Use the Clerk sign-in or create-account screen to authenticate.", "CLERK_AUTH_REQUIRED");
  const { sessionId } = await auth();
  if (sessionId) await (await clerkClient()).sessions.revokeSession(sessionId);
  return NextResponse.json({ ...status(), user: null });
});

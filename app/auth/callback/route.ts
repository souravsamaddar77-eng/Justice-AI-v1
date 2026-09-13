import { NextResponse } from "next/server";
import { safeCaseReturnPath } from "@/lib/case-client";

// Keep old bookmarked confirmation links useful after switching to Clerk.
// A Supabase callback must not create an alternative case-authentication path.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = new URL(process.env.APP_URL || url.origin).origin;
  const target = new URL("/sign-in", origin);
  target.searchParams.set("redirect_url", safeCaseReturnPath(url.searchParams.get("next"), origin));
  return NextResponse.redirect(target, { headers: { "Cache-Control": "private, no-store" } });
}

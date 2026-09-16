import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextMiddleware } from "next/server";
import { authConfigured } from "@/lib/auth/config";

// Public legal tools stay public. Private APIs validate Clerk identity and
// individual case/material permissions in the server authorization layer.
// Let Clerk select proxy behavior for the instance; development keys use its
// hosted Frontend API directly. Explicit proxying is production-only.
const clerk = clerkMiddleware();
const middleware: NextMiddleware = (request, event) => {
  // Missing auth setup must not take public tools offline. Private APIs still
  // reject requests in getAuthIdentity when either credential is absent.
  if (!authConfigured()) return NextResponse.next();
  return clerk(request, event);
};
export default middleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};

import { clerkMiddleware } from "@clerk/nextjs/server";

// Public legal tools stay public. Private APIs validate Clerk identity and
// individual case/material permissions in the server authorization layer.
// Let Clerk select proxy behavior for the instance; development keys use its
// hosted Frontend API directly. Explicit proxying is production-only.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};

import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { CaseError } from "@/lib/cases/validation";

export const AUTH_SETUP_MESSAGE = "Connect the Clerk application with clerk env pull to enable sign-in.";
export function authConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() && process.env.CLERK_SECRET_KEY?.trim());
}

export interface AuthIdentity { subject: string; email: string; legacyUserId?: string }
export async function getAuthIdentity(required = true): Promise<AuthIdentity | null> {
  if (!authConfigured()) {
    if (required) throw new CaseError(503, AUTH_SETUP_MESSAGE, "SETUP_REQUIRED");
    return null;
  }
  const { userId } = await auth();
  if (!userId) {
    if (required) throw new CaseError(401, "Sign in to access private cases.", "SIGN_IN_REQUIRED");
    return null;
  }
  const user = await currentUser();
  if (!user || user.id !== userId) throw new CaseError(401, "Your session could not be verified. Sign in again.");
  const email = user.emailAddresses.find(address => address.id === user.primaryEmailAddressId);
  if (!email || email.verification?.status !== "verified") throw new CaseError(403, "Verify your primary email before accessing private cases.", "EMAIL_VERIFICATION_REQUIRED");
  // externalId is an administrator-managed Clerk field, never user metadata.
  // Imported Supabase accounts can retain their existing case UUID this way.
  const legacyUserId = user.externalId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.externalId) ? user.externalId : undefined;
  return { subject: user.id, email: email.emailAddress.toLowerCase(), ...(legacyUserId ? { legacyUserId } : {}) };
}

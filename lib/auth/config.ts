// Used by server components, route handlers and middleware. Only pass the
// resulting boolean to client components; never pass the secret key.
export function authConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() && process.env.CLERK_SECRET_KEY?.trim());
}

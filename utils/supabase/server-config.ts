import "server-only";
import { getPublicSupabaseConfig } from "./config";

export function getServerSupabaseConfig() {
  const publicConfig = getPublicSupabaseConfig();
  if (publicConfig) return publicConfig;
  // Keep installations using the previous environment names working.
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_ANON_KEY?.trim();
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

export function requireServerSupabaseConfig() {
  const settings = getServerSupabaseConfig();
  if (!settings) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to enable sign-in.");
  return settings;
}

export const authFetch: typeof fetch = (input, init) => fetch(input, {
  ...init,
  cache: "no-store",
  signal: AbortSignal.any([AbortSignal.timeout(15_000), ...(init?.signal ? [init.signal] : [])]),
});

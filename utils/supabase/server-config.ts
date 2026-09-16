import "server-only";
import { getPublicSupabaseConfig } from "./config";

export function getServerSupabaseConfig() {
  const publicConfig = getPublicSupabaseConfig();
  if (publicConfig) return publicConfig;
  // Keep installations using the previous environment names working.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

export function requireServerSupabaseConfig() {
  const settings = getServerSupabaseConfig();
  if (!settings) throw new Error("Configure the Supabase URL and publishable/anon key to use this Supabase client. Clerk handles application sign-in.");
  return settings;
}

/** Elevated access is server-only and does not require a separate anon key. */
export function getCaseStorageConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const service = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !service) return null;
  try {
    const parsed = new URL(url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if ((parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") return null;
    if (service.startsWith("sb_publishable_")) return null;
    // A legacy anon JWT is not an elevated Storage credential.
    if (service.split(".").length === 3) {
      const payload = JSON.parse(Buffer.from(service.split(".")[1], "base64url").toString());
      if (payload.role !== "service_role") return null;
    }
    return { url: parsed.origin, service };
  } catch { return null; }
}

export const authFetch: typeof fetch = (input, init) => fetch(input, {
  ...init,
  cache: "no-store",
  signal: AbortSignal.any([AbortSignal.timeout(15_000), ...(init?.signal ? [init.signal] : [])]),
});

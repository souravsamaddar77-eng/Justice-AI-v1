import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { cookies } from "next/headers";
import { cookieOptions } from "./config";
import { authFetch, requireServerSupabaseConfig } from "./server-config";

export function createClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const { url, key } = requireServerSupabaseConfig();
  return createServerClient(url, key, {
    cookieOptions,
    global: { fetch: authFetch },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. Middleware refreshes them;
          // route handlers and Server Actions persist mutations here.
        }
      },
    },
  });
}

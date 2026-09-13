import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { cookieOptions } from "./config";
import { authFetch, getServerSupabaseConfig } from "./server-config";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const settings = getServerSupabaseConfig();
  if (!settings) return response;

  const supabase = createServerClient(settings.url, settings.key, {
    cookieOptions,
    global: { fetch: authFetch },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        const previousCookies = response.cookies.getAll();
        const previousHeaders = new Headers(response.headers);
        response = NextResponse.next({ request });
        previousCookies.forEach(cookie => response.cookies.set(cookie));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        for (const name of ["Cache-Control", "Expires", "Pragma"]) {
          const value = previousHeaders.get(name);
          if (value) response.headers.set(name, value);
        }
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        response.headers.set("Cache-Control", "private, no-store, max-age=0");
      },
    },
  });

  // Creating a client alone does not refresh a session. getUser refreshes an
  // expired token and validates identity with Auth; case APIs verify again.
  await supabase.auth.getUser();
  return response;
}

export const createClient = updateSession;

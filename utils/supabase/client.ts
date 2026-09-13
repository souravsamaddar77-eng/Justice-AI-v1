"use client";

import { createBrowserClient } from "@supabase/ssr";
import { cookieOptions, getPublicSupabaseConfig } from "./config";

export function createClient() {
  const settings = getPublicSupabaseConfig();
  if (!settings) throw new Error("Supabase sign-in is not configured.");
  return createBrowserClient(settings.url, settings.key, { cookieOptions });
}

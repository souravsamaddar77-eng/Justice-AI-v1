import { isLanguage, type Language } from "@/lib/i18n";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export interface Preferences { language: Language; theme: Theme }
export const PREFERENCES_STORAGE_KEY = "justice-ai.preferences.v1";
export const DEFAULT_PREFERENCES: Preferences = { language: "en", theme: "system" };

export function parsePreferences(value: string | null): Preferences {
  try {
    const saved: unknown = JSON.parse(value ?? "null");
    if (!saved || typeof saved !== "object") return DEFAULT_PREFERENCES;
    const candidate = saved as Record<string, unknown>;
    return {
      language: isLanguage(candidate.language) ? candidate.language : "en",
      theme: candidate.theme === "light" || candidate.theme === "dark" ? candidate.theme : "system",
    };
  } catch { return DEFAULT_PREFERENCES; }
}

export function resolveTheme(theme: Theme, systemDark: boolean): ResolvedTheme {
  return theme === "system" ? (systemDark ? "dark" : "light") : theme;
}

// Run in the document head before paint; values are fixed, never user-interpolated.
// The root <html> must use suppressHydrationWarning for these client preferences.
export const PREFERENCES_INIT_SCRIPT = `(function(){var p={};try{p=JSON.parse(localStorage.getItem('justice-ai.preferences.v1')||'{}')||{}}catch(e){}var l=['en','hi','bn','ta','te','mr','gu','kn','ml','pa'].indexOf(p.language)>=0?p.language:'en';var t=p.theme==='light'||p.theme==='dark'?p.theme:'system';var d=t==='dark'||(t==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.lang=l;r.dataset.theme=d?'dark':'light';r.classList.toggle('dark',!!d);r.style.colorScheme=d?'dark':'light'})();`;

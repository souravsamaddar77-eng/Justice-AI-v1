"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translate, type Language } from "@/lib/i18n";
import { DEFAULT_PREFERENCES, parsePreferences, PREFERENCES_STORAGE_KEY, resolveTheme, type Preferences, type ResolvedTheme, type Theme } from "@/lib/preferences";

interface PreferencesContextValue extends Preferences {
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
  t: (source: string) => string;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [systemDark, setSystemDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { setPreferences(parsePreferences(window.localStorage.getItem(PREFERENCES_STORAGE_KEY))); } catch { /* Storage can be disabled; preferences still work in this tab. */ }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);
    setReady(true);
    const onSystemChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    const onStorage = (event: StorageEvent) => {
      if (event.key === PREFERENCES_STORAGE_KEY || event.key === null) setPreferences(parsePreferences(event.newValue));
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => { media.removeEventListener("change", onSystemChange); window.removeEventListener("storage", onStorage); };
  }, []);

  const resolvedTheme = resolveTheme(preferences.theme, systemDark);
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.lang = preferences.language;
    root.dataset.theme = resolvedTheme;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
    try { window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences)); } catch { /* No persistence when browser storage is unavailable. */ }
  }, [preferences, resolvedTheme, ready]);

  const setLanguage = useCallback((language: Language) => setPreferences(current => ({ ...current, language })), []);
  const setTheme = useCallback((theme: Theme) => setPreferences(current => ({ ...current, theme })), []);
  const t = useCallback((source: string) => translate(preferences.language, source), [preferences.language]);
  const value = useMemo(() => ({ ...preferences, setLanguage, setTheme, resolvedTheme, t }), [preferences, setLanguage, setTheme, resolvedTheme, t]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used within PreferencesProvider");
  return context;
}

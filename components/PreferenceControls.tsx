"use client";

import { useEffect, useId, useRef } from "react";
import { Languages, Monitor, Moon, Sun } from "lucide-react";
import { LANGUAGES, isLanguage } from "@/lib/i18n";
import { usePreferences } from "@/components/PreferencesProvider";

export function LanguageSelector({ prominent = false }: { prominent?: boolean }) {
  const id = useId();
  const { language, setLanguage, t } = usePreferences();
  return <div className={`language-selector${prominent ? " language-selector-prominent" : ""}`}>
    <label htmlFor={id}><Languages size={18} aria-hidden="true" /><span>{t("Language")}</span></label>
    <select id={id} value={language} onChange={event => { if (isLanguage(event.target.value)) setLanguage(event.target.value); }}>
      {LANGUAGES.map(option => <option key={option.code} value={option.code} lang={option.code}>{option.name}{option.code !== "en" ? ` · ${option.englishName}` : ""}</option>)}
    </select>
  </div>;
}

export function ThemeSelector() {
  const { theme, setTheme, t } = usePreferences();
  return <fieldset className="theme-selector"><legend>{t("Appearance")}</legend><div>
    {([{ value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }, { value: "system", label: "Auto-detect", icon: Monitor }] as const).map(({ value, label, icon: Icon }) =>
      <button key={value} type="button" aria-pressed={theme === value} onClick={() => setTheme(value)} title={value === "system" ? t("Follow your device theme") : t(label)}><Icon size={16} aria-hidden="true"/><span>{t(label)}</span></button>)}
  </div></fieldset>;
}

export default function PreferenceControls() {
  const { t, resolvedTheme } = usePreferences();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => { if (event.target instanceof Node && !menu.current?.contains(event.target) && menu.current) menu.current.open = false; };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.current?.open) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); }
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismissOutside); document.removeEventListener("keydown", escape); };
  }, []);
  return <details ref={menu} className="preferences-menu" onBlur={event => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}>
    <summary aria-label={t("Language and appearance")} title={t("Language and appearance")}><Languages size={18} aria-hidden="true"/>{resolvedTheme === "dark" ? <Moon size={14} aria-hidden="true"/> : <Sun size={14} aria-hidden="true"/>}</summary>
    <div className="preferences-popover"><h2>{t("Make yourself comfortable")}</h2><LanguageSelector/><ThemeSelector/></div>
  </details>;
}

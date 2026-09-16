"use client";
import Link from "next/link";
import { usePreferences } from "@/components/PreferencesProvider";
export default function Footer() {
  const { t } = usePreferences();
  return <footer className="app-footer"><p>{t("Review case-specific decisions with an advocate.")}</p><div><span>© {new Date().getFullYear()} Justice AI</span><Link href="/citizen#legal-aid">{t("Free legal aid")}</Link><Link href="/tools">{t("All tools")}</Link></div></footer>;
}

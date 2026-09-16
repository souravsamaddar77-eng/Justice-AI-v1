"use client";
import type { ReactNode } from "react";
import { usePreferences } from "@/components/PreferencesProvider";
export default function PageHeader({title, description, eyebrow, actions}: {title:string; description:string; eyebrow?:string; actions?:ReactNode}) {
  const { t } = usePreferences();
  return <div className="page-heading"><div>{eyebrow && <p className="page-context">{t(eyebrow)}</p>}<h1>{t(title)}</h1><p className="page-description">{t(description)}</p></div>{actions && <div className="page-heading-actions">{actions}</div>}</div>;
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { TOOLS } from "@/lib/navigation";
import { usePreferences } from "@/components/PreferencesProvider";
export default function ToolsPage() {
  const { t } = usePreferences();
  const [query, setQuery] = useState("");
  const filtered = TOOLS.filter(tool => `${t(tool.title)} ${t(tool.description)} ${tool.title} ${tool.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <div className="workspace-page">
    <PageHeader title="The right tool for your next step." description="Use the tool directly. Save to a case when you’re ready."/>
    <label className="tools-filter"><Search size={19}/><input type="search" placeholder={t("Find a tool")} aria-label={t("Search tools")} value={query} onChange={e=>setQuery(e.target.value)}/></label>
    {["Get legal help","For your practice","Your workspace"].map(group => {
      const matches = filtered.filter(tool => tool.group === group);
      return matches.length ? <section className="tool-group" key={group}><h2>{t(group)}</h2><div className="tool-directory">{matches.map(tool => <Link key={tool.href} href={tool.href}><span className="tool-icon"><tool.icon size={21}/></span><div><h3>{t(tool.title)}</h3><p>{t(tool.description)}</p></div><ArrowUpRight size={17}/></Link>)}</div></section> : null;
    })}
    {filtered.length === 0 && <p className="my-8 text-navy-500">{t("No tools found. Try another search.")}</p>}
  </div>;
}

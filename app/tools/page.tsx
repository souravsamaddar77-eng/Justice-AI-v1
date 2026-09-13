"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { TOOLS } from "@/lib/navigation";
export default function ToolsPage() {
  const [query, setQuery] = useState("");
  const filtered = TOOLS.filter(t => `${t.title} ${t.description}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="workspace-page"><PageHeader title="The right tool for your next step." description="Use any tool on its own. Save useful results to a case whenever you need to."/><label className="tools-filter"><Search size={19}/><input type="search" placeholder="Find a tool…" aria-label="Filter tools" value={query} onChange={e=>setQuery(e.target.value)}/></label>{["Get legal help","For your practice","Your workspace"].map(group => {const matches = filtered.filter(t=>t.group === group); return matches.length ? <section className="tool-group" key={group}><h2>{group}</h2><div className="tool-directory">{matches.map(tool => <Link key={tool.href} href={tool.href}><span className="tool-icon"><tool.icon size={21}/></span><div><h3>{tool.title}</h3><p>{tool.description}</p></div><ArrowUpRight size={17}/></Link>)}</div></section> : null;})}{filtered.length === 0 && <p className="my-8 text-navy-500">No tools found. Try “notice”, “draft” or “aid”.</p>}</div>;
}

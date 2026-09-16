"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftRight, PenLine, Gavel, FolderOpen } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import IpBnsConverter from "@/components/IpBnsConverter";
import DraftingCopilot from "@/components/DraftingCopilot";
import LokAdalatUpdates from "@/components/LokAdalatUpdates";
import { usePreferences } from "@/components/PreferencesProvider";

const tabs = [{id:"drafting",title:"Draft a document",icon:PenLine},{id:"converter",title:"IPC to BNS converter",icon:ArrowLeftRight},{id:"lok-adalat",title:"Lok Adalat",icon:Gavel}];
function AdvocateWorkspace() {
  const { t } = usePreferences();
  const params = useSearchParams();
  const router = useRouter();
  const selectedTool = params.get("tool");
  const [active,setActive] = useState("drafting");
  useEffect(() => { const target = selectedTool || window.location.hash.slice(1); setActive(tabs.some(tab => tab.id === target) ? target : "drafting"); }, [selectedTool]);
  const select = (id:string) => {setActive(id); router.replace(`/advocate?tool=${id}`, {scroll:false});};
  return <div className="workspace-page"><PageHeader eyebrow="Advocate tools" title="Your legal workspace" description="Keep documents, tasks and reviewed work together." actions={<Link href="/cases" className="btn-secondary"><FolderOpen size={17}/>{t("My cases")}</Link>}/><div className="focus-tabs" role="tablist" aria-label={t("Advocate tools")}>{tabs.map(({id,title,icon:Icon},index)=><button key={id} role="tab" id={`tab-${id}`} aria-controls={id} aria-selected={active===id} tabIndex={active===id?0:-1} onClick={()=>select(id)} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=tabs[(index+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];select(next.id);document.getElementById(`tab-${next.id}`)?.focus();}}}><Icon size={17}/>{t(title)}</button>)}</div>
  <section id="drafting" role="tabpanel" aria-labelledby="tab-drafting" hidden={active!=="drafting"}><DraftingCopilot/></section>
  <section id="converter" role="tabpanel" aria-labelledby="tab-converter" hidden={active!=="converter"}><h2 className="text-xl font-semibold mb-2">{t("IPC to BNS converter")}</h2><p className="text-sm text-navy-500 mb-5">{t("Search the section mapping reference.")}</p><IpBnsConverter/></section>
  <section id="lok-adalat" role="tabpanel" aria-labelledby="tab-lok-adalat" hidden={active!=="lok-adalat"}><h2 className="text-xl font-semibold mb-2">{t("Lok Adalat")}</h2><p className="text-sm text-navy-500 mb-5">{t("Find sittings and mediation information.")}</p><LokAdalatUpdates/></section>
  <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-navy-600"><Link href="/advocate/cases">{t("Case intake")}</Link><Link href="/advocate/draft-review">{t("Draft review")}</Link><Link href="/advocate/precedents">{t("Precedents & judgments")}</Link><Link href="/advocate/network">{t("Advocate network")}</Link></div></div>;
}

export default function AdvocatePage() { return <Suspense fallback={<div className="workspace-page" role="status">Opening advocate tools…</div>}><AdvocateWorkspace/></Suspense>; }

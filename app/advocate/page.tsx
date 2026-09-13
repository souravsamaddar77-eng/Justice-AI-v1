"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftRight, PenLine, Gavel, FolderOpen } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import IpBnsConverter from "@/components/IpBnsConverter";
import DraftingCopilot from "@/components/DraftingCopilot";
import LokAdalatUpdates from "@/components/LokAdalatUpdates";
import ChatWidget from "@/components/ChatWidget";
const tabs = [{id:"drafting",title:"Draft a document",icon:PenLine},{id:"converter",title:"IPC to BNS",icon:ArrowLeftRight},{id:"lok-adalat",title:"Lok Adalat",icon:Gavel}];
function AdvocateWorkspace() {
  const params = useSearchParams();
  const router = useRouter();
  const selectedTool = params.get("tool");
  const [active,setActive] = useState("drafting");
  useEffect(() => { const target = selectedTool || window.location.hash.slice(1); setActive(tabs.some(tab => tab.id === target) ? target : "drafting"); }, [selectedTool]);
  const select = (id:string) => {setActive(id); router.replace(`/advocate?tool=${id}`, {scroll:false});};
  return <div className="workspace-page"><PageHeader eyebrow="Advocate tools" title="Make room for the work that matters." description="Draft, look up sections and plan for mediation. Your case documents stay in My cases." actions={<Link href="/cases" className="btn-secondary"><FolderOpen size={17}/>My cases</Link>}/><div className="focus-tabs" role="tablist" aria-label="Advocate tools">{tabs.map(({id,title,icon:Icon},index)=><button key={id} role="tab" id={`tab-${id}`} aria-controls={id} aria-selected={active===id} tabIndex={active===id?0:-1} onClick={()=>select(id)} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=tabs[(index+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];select(next.id);document.getElementById(`tab-${next.id}`)?.focus();}}}><Icon size={17}/>{title}</button>)}</div>
  <section id="drafting" role="tabpanel" aria-labelledby="tab-drafting" hidden={active!=="drafting"}><DraftingCopilot/></section>
  <section id="converter" role="tabpanel" aria-labelledby="tab-converter" hidden={active!=="converter"}><h2 className="text-xl font-semibold mb-2">IPC to BNS converter</h2><p className="text-sm text-navy-500 mb-5">Search the sample mapping. Verify the relevant provision against official legislation.</p><IpBnsConverter/></section>
  <section id="lok-adalat" role="tabpanel" aria-labelledby="tab-lok-adalat" hidden={active!=="lok-adalat"}><h2 className="text-xl font-semibold mb-2">Lok Adalat updates</h2><p className="text-sm text-navy-500 mb-5">Search sittings in West Bengal and check the linked authority before making plans.</p><LokAdalatUpdates/></section>
  <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-navy-600"><Link href="/advocate/cases">Case intake demo</Link><Link href="/advocate/draft-review">Draft review demo</Link><Link href="/advocate/precedents">Precedents & judgments</Link><Link href="/advocate/network">Advocate network</Link></div><ChatWidget persona="advocate"/></div>;
}

export default function AdvocatePage() { return <Suspense fallback={<div className="workspace-page" role="status">Opening advocate tools…</div>}><AdvocateWorkspace/></Suspense>; }

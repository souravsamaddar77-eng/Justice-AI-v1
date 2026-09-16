"use client";
import Link from "next/link";
import { ArrowRight, FolderOpen, FileSearch, Mic, CalendarCheck2, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import LegalAid from "@/components/LegalAid";
import { usePreferences } from "@/components/PreferencesProvider";
export default function CitizenPortalPage() {
  const { t } = usePreferences();
  return <div className="workspace-page">
    <PageHeader eyebrow="Citizen tools" title="Let’s take it one step at a time." description="Choose what you need today." actions={<Link href="/cases" className="btn-secondary"><FolderOpen size={17}/>{t("My cases")}</Link>}/>
    <div className="tool-directory">{[{title:"Understand a notice",description:"Read a legal notice in plain language.",href:"/victim-citizen",icon:FileSearch},{title:"Talk to the assistant",description:"Ask questions by voice or text.",href:"/citizen/voice-assistant",icon:Mic},{title:"Action tracker",description:"Review next steps and manage case tasks.",href:"/citizen/action-tracker",icon:CalendarCheck2},{title:"Find a lawyer",description:"Explore the sample lawyer directory.",href:"/citizen/lawyers",icon:Users}].map(({title,description,href,icon:Icon})=><Link key={href} href={href}><span className="tool-icon"><Icon size={22}/></span><div><h3>{t(title)}</h3><p>{t(description)}</p></div><ArrowRight size={17}/></Link>)}</div>
    <section id="legal-aid" className="mt-12"><h2 className="text-xl font-semibold">{t("Free legal aid")}</h2><p className="text-sm text-navy-500 mt-2 mb-6 max-w-2xl leading-relaxed">{t("Explore clinics, forms and rights handbooks.")}</p><LegalAid/></section>
    <div className="mt-8"><Link href="/victim-citizen#support" className="text-sm font-medium text-navy-600 inline-flex items-center gap-2">{t("Browse state legal aid and government schemes")}<ArrowRight size={16}/></Link></div>
  </div>;
}

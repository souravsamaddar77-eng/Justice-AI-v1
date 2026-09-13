"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Scale, House, FolderOpen, LayoutGrid, UserRound, BriefcaseBusiness, Search, Menu, X, ChevronRight, ArrowUpRight, CircleHelp } from "lucide-react";
import { TOOLS } from "@/lib/navigation";
import AccountControls from "@/components/AccountControls";

export default function Navbar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const finder = useRef<HTMLDialogElement>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setOpen(false); drawer.current?.close(); finder.current?.close();
  }, [path]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault(); finder.current?.showModal(); searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const current = TOOLS.find(t => t.href.split(/[?#]/)[0] === path);
  const pageName = path === "/" ? "Home" : path.startsWith("/cases") ? "My cases" : path === "/tools" ? "All tools" : path.startsWith("/sign-in") || path.startsWith("/sign-up") ? "Your account" : current?.title ?? "Justice AI";
  const closeNav = () => { setOpen(false); drawer.current?.close(); };
  const openTool = (event: React.MouseEvent, href: string) => {
    finder.current?.close();
    const [target, hash] = href.split("#");
    if (target === path && hash) { event.preventDefault(); window.location.hash = hash; }
  };
  const links = <>
    <div className="nav-group">
      {[{href:"/", label:"Home", icon:House}, {href:"/cases", label:"My cases", icon:FolderOpen}, {href:"/tools", label:"All tools", icon:LayoutGrid}].map(({href,label,icon:Icon}) =>
        <Link key={href} href={href} onClick={closeNav} className={`side-link ${path === href || (href === "/cases" && path.startsWith("/cases/")) ? "active" : ""}`} aria-current={path === href ? "page" : undefined}><Icon size={19}/>{label}</Link>)}
    </div>
    <div className="nav-group portal-links"><p>Workspaces</p>
      <Link href="/citizen" onClick={closeNav} className={`side-link ${path.startsWith("/citizen") || path === "/victim-citizen" ? "active" : ""}`}><UserRound size={19}/>Citizen tools</Link>
      <Link href="/advocate" onClick={closeNav} className={`side-link ${path.startsWith("/advocate") ? "active" : ""}`}><BriefcaseBusiness size={19}/>Advocate tools</Link>
    </div>
    <div className="sidebar-help"><Scale size={23}/><p>A little clarity.<br/>A better next step.</p><Link href="/citizen#legal-aid" onClick={closeNav}>Find legal aid <ArrowUpRight size={15}/></Link></div>
    <Link href="/portal" className="side-link demo-link" onClick={closeNav}><CircleHelp size={18}/>Explore the demo</Link>
  </>;
  return <>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="desktop-sidebar" aria-label="Main navigation">
      <Link href="/" className="brand"><span className="brand-mark"><Scale size={23}/></span><span>Justice <b>AI</b><small>Clarity. Confidence. Justice.</small></span></Link>{links}
      <p className="sidebar-note">Built for India</p>
    </aside>
    <header className="app-topbar">
      <button className="mobile-menu icon-button" onClick={() => {setOpen(true); drawer.current?.showModal();}} aria-expanded={open} aria-label="Open navigation"><Menu size={22}/></button>
      <div className="breadcrumb"><span>Justice AI</span><ChevronRight size={14}/><strong>{pageName}</strong></div>
      <div className="topbar-actions"><button className="tool-search-button" aria-label="Find a tool" onClick={() => {finder.current?.showModal();searchInput.current?.focus();}}><Search size={17}/><span>Find a tool</span><kbd>Ctrl K</kbd></button><AccountControls /></div>
    </header>
    <dialog ref={drawer} className="mobile-drawer" onClose={() => setOpen(false)} onClick={event => {if(event.target === event.currentTarget) closeNav();}} aria-label="Main navigation">
      <div className="drawer-header"><Link href="/" className="brand" onClick={closeNav}><Scale size={23}/>Justice AI</Link><button className="icon-button" onClick={closeNav} aria-label="Close navigation"><X size={21}/></button></div>{links}
    </dialog>
    <dialog ref={finder} className="tool-finder" aria-labelledby="finder-title" onClick={event => {if(event.target === event.currentTarget) finder.current?.close();}}>
      <div className="finder-heading"><h2 id="finder-title">Find your next step</h2><button className="icon-button" onClick={() => finder.current?.close()} aria-label="Close tool search"><X size={20}/></button></div>
      <label className="finder-input"><Search size={19}/><input ref={searchInput} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tools, documents, legal aid…" aria-label="Search tools"/></label>
      <div className="finder-results">{TOOLS.filter(t => `${t.title} ${t.description} ${t.group}`.toLowerCase().includes(query.toLowerCase())).map(tool => <Link key={tool.href} href={tool.href} onClick={event => openTool(event, tool.href)}><tool.icon size={20}/><span><strong>{tool.title}</strong><small>{tool.description}</small></span><ChevronRight size={17}/></Link>)}{!TOOLS.some(t => `${t.title} ${t.description} ${t.group}`.toLowerCase().includes(query.toLowerCase())) && <p className="p-5 text-sm text-navy-500">No tools match this search. Try “notice”, “draft” or “lawyer”.</p>}</div>
    </dialog>
  </>;
}

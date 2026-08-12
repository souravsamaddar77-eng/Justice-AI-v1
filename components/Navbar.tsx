"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, Menu, X, ChevronDown, UserRound, Mic, CalendarClock, Gavel, FileText, Briefcase, Users, LogIn, Briefcase as BriefcaseIcon, Search, FileSearch, Gavel as GavelIcon, Compass } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [citizenOpen, setCitizenOpen] = useState(false);
  const citizenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (citizenRef.current && !citizenRef.current.contains(event.target as Node)) {
        setCitizenOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isCitizenActive = pathname.startsWith("/victim-citizen") || pathname.startsWith("/citizen");
  const isAdvocateActive = pathname.startsWith("/advocate");
  const [advocateOpen, setAdvocateOpen] = useState(false);
  const advocateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (citizenRef.current && !citizenRef.current.contains(event.target as Node)) {
        setCitizenOpen(false);
      }
      if (advocateRef.current && !advocateRef.current.contains(event.target as Node)) {
        setAdvocateOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-navy-200/70 bg-navy-900/95 backdrop-blur supports-[backdrop-filter]:bg-navy-900/80">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold-500 to-gold-300 shadow-sm">
            <Scale className="h-5 w-5 text-navy-950" strokeWidth={2.2} />
          </span>
          <span className="font-serif text-lg font-semibold tracking-tight text-white">
            Justice <span className="text-brand-gradient">AI</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          <Link
            href="/"
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              pathname === "/" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            Home
          </Link>

          {/* Citizen Portal Dropdown */}
          <div className="relative" ref={citizenRef}>
            <button
              onClick={() => setCitizenOpen((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                isCitizenActive ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
              }`}
              aria-expanded={citizenOpen}
              aria-haspopup="true"
            >
              <UserRound className="h-4 w-4" />
              Citizen Portal
              <ChevronDown className={`h-4 w-4 transition-transform ${citizenOpen ? "rotate-180" : ""}`} />
            </button>

            {citizenOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-navy-900/95 backdrop-blur supports-[backdrop-filter]:bg-navy-900/80 shadow-lg animate-fade-up">
                <Link
                  href="/victim-citizen"
                  className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                    pathname === "/victim-citizen" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => setCitizenOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Dashboard
                  </div>
                </Link>
                <Link
                  href="/citizen/voice-assistant"
                  className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                    pathname === "/citizen/voice-assistant" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => setCitizenOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    Voice Assistant
                  </div>
                </Link>
                <Link
                  href="/citizen/action-tracker"
                  className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                    pathname === "/citizen/action-tracker" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => setCitizenOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    Action Tracker
                  </div>
                </Link>
                <Link
                  href="/citizen/lawyers"
                  className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                    pathname === "/citizen/lawyers" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => setCitizenOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <Gavel className="h-4 w-4" />
                    Find Lawyers
                  </div>
                </Link>
                <Link
                  href="/citizen#legal-aid"
                  className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                    pathname === "/citizen" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => setCitizenOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <Compass className="h-4 w-4" />
                    Legal Aid
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Advocate Portal Dropdown */}
          <div className="relative" ref={advocateRef}>
            <button
              onClick={() => setAdvocateOpen((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                isAdvocateActive ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
              }`}
              aria-expanded={advocateOpen}
              aria-haspopup="true"
            >
              <BriefcaseIcon className="h-4 w-4" />
              Advocate Portal
              <ChevronDown className={`h-4 w-4 transition-transform ${advocateOpen ? "rotate-180" : ""}`} />
            </button>

            {advocateOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-navy-900/95 backdrop-blur supports-[backdrop-filter]:bg-navy-900/80 shadow-lg animate-fade-up">
                <Link
                  href="/advocate"
                  className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                    pathname === "/advocate" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => setAdvocateOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <BriefcaseIcon className="h-4 w-4" />
                    Workspace
                  </div>
                </Link>
                <Link
                  href="/advocate/cases"
                  className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                    pathname === "/advocate/cases" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => setAdvocateOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <FileSearch className="h-4 w-4" />
                    Smart Intake
                  </div>
                </Link>
                <Link
                  href="/advocate/draft-review"
                  className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                    pathname === "/advocate/draft-review" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => setAdvocateOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Draft Review
                  </div>
                </Link>
                <Link
                  href="/advocate/precedents"
                  className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                    pathname === "/advocate/precedents" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => setAdvocateOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <GavelIcon className="h-4 w-4" />
                    Precedents
                  </div>
                </Link>
                <Link
                  href="/advocate/network"
                  className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                    pathname === "/advocate/network" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => setAdvocateOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Lawyer Network
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-navy-200 hover:bg-white/10 hover:text-white sm:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-navy-900 px-4 py-2 sm:hidden">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
              pathname === "/" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            Home
          </Link>
          <Link
            href="/victim-citizen"
            onClick={() => setOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
              pathname === "/victim-citizen" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4" /> Citizen Portal
            </div>
          </Link>
          <Link
            href="/citizen/voice-assistant"
            onClick={() => setOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
              pathname === "/citizen/voice-assistant" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2 ml-2">
              <Mic className="h-4 w-4" /> Voice Assistant
            </div>
          </Link>
          <Link
            href="/citizen/action-tracker"
            onClick={() => setOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
              pathname === "/citizen/action-tracker" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2 ml-2">
              <CalendarClock className="h-4 w-4" /> Action Tracker
            </div>
          </Link>
          <Link
            href="/citizen/lawyers"
            onClick={() => setOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
              pathname === "/citizen/lawyers" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2 ml-2">
              <Gavel className="h-4 w-4" /> Find Lawyers
            </div>
          </Link>
          <Link
            href="/citizen#legal-aid"
            onClick={() => setOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
              pathname === "/citizen" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2 ml-2">
              <Compass className="h-4 w-4" /> Legal Aid
            </div>
          </Link>
          <Link
            href="/advocate"
            onClick={() => setOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
              pathname === "/advocate" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            Advocate Portal
          </Link>
          <Link
            href="/advocate/cases"
            onClick={() => setOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
              pathname === "/advocate/cases" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2 ml-2">
              <FileSearch className="h-4 w-4" /> Smart Intake
            </div>
          </Link>
          <Link
            href="/advocate/draft-review"
            onClick={() => setOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
              pathname === "/advocate/draft-review" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2 ml-2">
              <FileText className="h-4 w-4" /> Draft Review
            </div>
          </Link>
          <Link
            href="/advocate/precedents"
            onClick={() => setOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
              pathname === "/advocate/precedents" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2 ml-2">
              <GavelIcon className="h-4 w-4" /> Precedents
            </div>
          </Link>
          <Link
            href="/advocate/network"
            onClick={() => setOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
              pathname === "/advocate/network" ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2 ml-2">
              <Users className="h-4 w-4" /> Lawyer Network
            </div>
          </Link>
        </div>
      )}
    </header>
  );
}

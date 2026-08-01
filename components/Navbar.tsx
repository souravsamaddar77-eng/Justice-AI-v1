"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: "Home" },
    { href: "/citizen", label: "Citizen Portal" },
    { href: "/advocate", label: "Advocate Portal" },
  ];

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
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
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
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                pathname === l.href ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

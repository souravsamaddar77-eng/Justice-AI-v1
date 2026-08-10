import Link from "next/link";
import { Scale, Github, AlertTriangle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-navy-200/70 bg-navy-900 text-navy-300">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold-500 to-gold-300">
                <Scale className="h-5 w-5 text-navy-950" strokeWidth={2.2} />
              </span>
              <span className="font-serif text-lg font-semibold text-white">
                Justice <span className="text-brand-gradient">AI</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-navy-400">
              An Indian Legal AI platform — making the law approachable for citizens and faster for advocates.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/" className="hover:text-gold-300">Home</Link></li>
              <li><Link href="/victim-citizen" className="hover:text-gold-300">Victim/Citizen Portal</Link></li>
              <li><Link href="/advocate" className="hover:text-gold-300">Advocate Portal</Link></li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-white">
              <AlertTriangle className="h-4 w-4 text-gold-400" /> Disclaimer
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-navy-400">
              Justice AI is an educational prototype for a hackathon and does not constitute legal advice.
              Always consult a qualified advocate. The IPC↔BNS mapping is a sample subset — verify against the
              official BNS 2023 text.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-navy-400 sm:flex-row">
          <p>© {new Date().getFullYear()} Justice AI — Hackathon prototype.</p>
          <a
            href="https://nextjs.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-gold-300"
          >
            <Github className="h-3.5 w-3.5" /> Built with Next.js & Gemini
          </a>
        </div>
      </div>
    </footer>
  );
}

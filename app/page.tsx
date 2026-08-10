import Link from "next/link";
import {
  Scale,
  ScanText,
  MessageSquare,
  ArrowLeftRight,
  UserRound,
  Briefcase,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import FeatureCard from "@/components/FeatureCard";

export default function LandingPage() {
  return (
    <>
      {/* ─────────── HERO ─────────── */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        {/* Background flourish */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />
          <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-navy-700/30 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-1 justice-stripe" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm text-navy-200">
            <ShieldCheck className="h-4 w-4 text-gold-400" />
            <span>AI for the Indian Legal System · Hackathon Prototype</span>
          </div>

          {/* Title */}
          <h1 className="max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Justice AI: <span className="text-brand-gradient">Empowering Citizens,</span> Equipping Advocates
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-navy-300">
            Decode complex legal notices into plain language and clear deadlines — or co-pilot your legal
            workflow with an IPC↔BNS converter and AI document drafting.
          </p>

          {/* Two entry buttons */}
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link href="/victim-citizen" className="btn-primary text-base">
              <UserRound className="h-5 w-5" />
              I am a Victim/Citizen (Get Legal Help)
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/advocate" className="btn-secondary text-base bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Briefcase className="h-5 w-5" />
              I am an Advocate (Workspace)
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Trust strip */}
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-navy-400">
            <span className="flex items-center gap-2"><Scale className="h-4 w-4 text-gold-400" /> Powered by Gemini & NVIDIA Nemotron</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold-400" /> Auto-redaction built in</span>
            <span className="flex items-center gap-2"><ArrowLeftRight className="h-4 w-4 text-gold-400" /> IPC ↔ BNS 2023 mapping</span>
          </div>
        </div>
      </section>

      {/* ─────────── FEATURES ─────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mb-10 text-center">
          <p className="eyebrow">What Justice AI does</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-navy-900">Three tools, one mission</h2>
          <div className="gold-rule mx-auto mt-4" />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={ScanText}
            title="Document Analysis"
            description="Upload a legal notice and get an urgency rating, a statutory deadline tracker, and a 3-point plain-language summary anyone can understand."
          />
          <FeatureCard
            icon={MessageSquare}
            title="AI Legal Chatbot"
            description="Ask follow-up questions like 'What happens if I ignore this notice?' and get instant, simple answers from the Justice AI assistant."
            accent
          />
          <FeatureCard
            icon={ArrowLeftRight}
            title="IPC ↔ BNS Converter"
            description="Search any old IPC section and instantly see the corresponding Bharatiya Nyaya Sanhita (2023) section — no more hunting through statutes."
          />
        </div>
      </section>

      {/* ─────────── SPLIT CTA ─────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Citizen card */}
          <Link
            href="/victim-citizen"
            className="group relative overflow-hidden rounded-2xl border border-navy-200 bg-white p-8 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-gold-100" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900">
              <UserRound className="h-6 w-6 text-gold-300" />
            </span>
            <h3 className="relative mt-5 font-serif text-2xl font-semibold text-navy-900">For Citizens</h3>
            <p className="relative mt-2 text-navy-600">
              Got a confusing legal notice? Upload it, understand it, and act before the deadline.
            </p>
            <span className="relative mt-4 inline-flex items-center gap-1.5 font-semibold text-gold-700 group-hover:text-gold-600">
              Enter Citizen Portal <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          {/* Advocate card */}
          <Link
            href="/advocate"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-navy-900 p-8 text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-gold-500/20" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500">
              <Briefcase className="h-6 w-6 text-navy-950" />
            </span>
            <h3 className="relative mt-5 font-serif text-2xl font-semibold">For Advocates</h3>
            <p className="relative mt-2 text-navy-300">
              Convert IPC to BNS in one search and draft bail applications, replies, and notices with an AI co-pilot.
            </p>
            <span className="relative mt-4 inline-flex items-center gap-1.5 font-semibold text-gold-300 group-hover:text-gold-200">
              Enter Advocate Workspace <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}

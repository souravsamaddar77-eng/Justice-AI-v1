"use client";

import { useState, useMemo } from "react";
import {
  Briefcase,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
  Gavel,
  Mic,
  CalendarClock,
  ShieldCheck,
  ArrowRight,
  BarChart3,
  UserRound,
  MessageSquare,
  ExternalLink,
  Sparkles,
  Clock,
  MapPin,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Star,
  Compass,
} from "lucide-react";
import Link from "next/link";
import LegalAid from "@/components/LegalAid";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  badge?: string;
  features: string[];
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "action-tracker",
    title: "Next-Steps Action Tracker",
    description: "Visual roadmap for your legal notice response. Track deadlines, urgency levels, and progress — never miss a critical date.",
    icon: <CalendarClock className="h-6 w-6" />,
    href: "/citizen/action-tracker",
    color: "bg-emerald-100 text-emerald-600",
    badge: "5 Steps",
    features: ["Statutory deadline tracking", "Urgency-based prioritization", "Progress visualization", "Checklist with details", "Quick action shortcuts"],
  },
  {
    id: "lawyers",
    title: "Find Verified Panel Lawyers",
    description: "Search NALSA-verified advocates near you by specialization, location, ratings, and fees. Geolocation support for nearby results.",
    icon: <UserRound className="h-6 w-6" />,
    href: "/citizen/lawyers",
    color: "bg-blue-100 text-blue-600",
    badge: "8+ Lawyers",
    features: ["Specialization filtering", "Location & distance sorting", "Rating & review display", "Fee range comparison", "Direct contact buttons", "NALSA verified profiles"],
  },
  {
    id: "voice-assistant",
    title: "Voice-Enabled Legal Assistant",
    description: "Speak naturally to get legal guidance. Justice AI listens, understands, and speaks back — powered by Web Speech API with Indian English support.",
    icon: <Mic className="h-6 w-6" />,
    href: "/citizen/voice-assistant",
    color: "bg-gold-100 text-gold-600",
    badge: "Voice + Text",
    features: ["Speech recognition (Hindi/English)", "Text-to-speech responses", "Legal expertise persona", "Conversation history", "Quick suggestion chips", "Privacy-first (local only)"],
  },
];

interface Stat {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

const STATS: Stat[] = [
  { label: "Action Steps", value: "15+", icon: <CheckCircle className="h-5 w-5" />, color: "text-emerald-500" },
  { label: "Panel Lawyers", value: "8+", icon: <UserRound className="h-5 w-5" />, color: "text-blue-500" },
  { label: "Legal Categories", value: "12+", icon: <BarChart3 className="h-5 w-5" />, color: "text-gold-500" },
  { label: "Voice Commands", value: "∞", icon: <Mic className="h-5 w-5" />, color: "text-purple-500" },
  { label: "Legal Aid Clinics", value: "1+", icon: <Compass className="h-5 w-5" />, color: "text-orange-500" },
];

export default function CitizenPortalPage() {
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  return (
    <div className="bg-navy-50/40 min-h-screen">
      {/* Header */}
      <section className="border-b border-navy-200/70 bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <span className="eyebrow text-gold-400">Citizen Portal</span>
          <h1 className="mt-2 flex items-center gap-3 font-serif text-3xl font-bold sm:text-4xl lg:text-5xl">
            <ShieldCheck className="h-10 w-10 text-gold-300" />
            Advanced Legal Tools
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-navy-300">
            Four powerful tools to understand your legal notice, find the right lawyer, get answers by voice,
            and locate free legal aid clinics — all powered by Justice AI with Indian legal context.
          </p>

          {/* Trust indicators */}
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-navy-400">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold-400" /> NALSA-verified data</span>
            <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-gold-400" /> AI-powered analysis</span>
            <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-gold-400" /> Multilingual voice support</span>
            <span className="flex items-center gap-2"><ExternalLink className="h-4 w-4 text-gold-400" /> Official portal links</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        {/* Stats Overview */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="card-surface p-5 hover:shadow-lg hover:border-gold-300/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-navy-100 ${stat.color}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy-900">{stat.value}</p>
                  <p className="text-sm text-navy-500">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions Grid */}
        <section className="mb-16">
          <div className="mb-8 text-center">
            <p className="eyebrow text-gold-500">Citizen Tools</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-navy-900">
              Everything you need to respond to a legal notice
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-navy-600">
              Start with document analysis on the main portal, then use these advanced tools to track next steps,
              find representation, and get real-time guidance.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {QUICK_ACTIONS.map((action) => (
              <QuickActionCard
                key={action.id}
                action={action}
                isExpanded={expandedAction === action.id}
                onToggle={() => setExpandedAction(expandedAction === action.id ? null : action.id)}
              />
            ))}
          </div>
        </section>

        {/* Legal Aid Section */}
        <section id="legal-aid" className="mb-16">
          <div className="mb-8 text-center">
            <p className="eyebrow text-gold-500">Legal Aid</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-navy-900">
              Free Legal Aid Clinics Near You
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-navy-600">
              Find your nearest law-school legal aid clinic. Brainware University (Kolkata) is the first clinic
              in our network — more colleges coming soon. Use GPS or select a city to locate clinics,
              download application forms, and access your rights handbook.
            </p>
          </div>
          <LegalAid />
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <div className="mb-8 text-center">
            <p className="eyebrow text-gold-500">Workflow</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-navy-900">How the tools work together</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <WorkflowStep
              number={1}
              title="Analyze Document"
              description="Upload your legal notice on the main Citizen Portal. Justice AI extracts key terms, flags urgency, identifies statutory deadlines, and gives you a plain-language summary."
              icon={<FileText className="h-6 w-6" />}
              color="bg-emerald-100 text-emerald-600"
            />
            <WorkflowStep
              number={2}
              title="Track Next Steps"
              description="Use the Action Tracker to see your personalized roadmap: reply deadlines, caveat filing, lawyer consultation, evidence gathering, and mediation options — all with countdown timers."
              icon={<CalendarClock className="h-6 w-6" />}
              color="bg-blue-100 text-blue-600"
            />
            <WorkflowStep
              number={3}
              title="Find & Engage Lawyer"
              description="Search NALSA-verified panel advocates by specialization, location, ratings, and fees. Use geolocation to find nearby lawyers. Contact directly via phone, email, or NALSA profile."
              icon={<UserRound className="h-6 w-6" />}
              color="bg-gold-100 text-gold-600"
            />
            <WorkflowStep
              number={4}
              title="Get Voice Guidance"
              description="Activate the Voice Assistant to ask follow-up questions in Hindi or English. Get spoken responses for hands-free guidance while reviewing documents or preparing for meetings."
              icon={<Mic className="h-6 w-6" />}
              color="bg-purple-100 text-purple-600"
            />
            <WorkflowStep
              number={5}
              title="File & Resolve"
              description="Use quick-action shortcuts to generate reply drafts, file caveats online, or prepare for mediation/Lok Adalat. Track completion and stay on top of every deadline."
              icon={<Gavel className="h-6 w-6" />}
              color="bg-red-100 text-red-600"
            />
            <WorkflowStep
              number={6}
              title="Stay Informed"
              description="All data sourced from official NALSA and state legal services authority portals. Auto-redaction protects your sensitive info. No data stored without consent."
              icon={<ShieldCheck className="h-6 w-6" />}
              color="bg-navy-100 text-navy-600"
            />
          </div>
        </section>

        {/* Back to Main Portal */}
        <div className="text-center">
          <Link
            href="/victim-citizen"
            className="inline-flex items-center gap-2 btn-secondary bg-white border-navy-200 hover:border-gold-300 hover:bg-gold-50"
          >
            <ArrowRight className="h-4 w-4 -rotate-90" />
            Back to Document Analysis Portal
          </Link>
          <p className="mt-3 text-sm text-navy-500">
            Upload a legal notice, get urgency rating, deadline tracker, and plain-language summary
          </p>
        </div>

        {/* Disclaimer */}
        <div className="mt-12 rounded-xl border border-amber-200 bg-amber-50/60 p-5 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              <strong>Disclaimer:</strong> These tools provide informational guidance based on common legal patterns and
              statutory timelines under Indian law. They are not a substitute for personalized legal advice from a
              qualified advocate. Actual deadlines, procedures, and remedies may vary based on the specific notice,
              jurisdiction, applicable law, and court rules. <strong>Always consult a qualified advocate for your specific
              situation.</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({
  action,
  isExpanded,
  onToggle,
}: {
  action: QuickAction;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`card-surface p-6 transition-all ${isExpanded ? "shadow-xl border-gold-300/50" : ""}`}>
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-xl ${action.color}`}>
          {action.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-navy-900">{action.title}</h3>
              {action.badge && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-navy-100 px-2 py-0.5 text-xs text-navy-600">
                  {action.badge}
                </span>
              )}
            </div>
            <button
              onClick={onToggle}
              className="flex-shrink-0 rounded-lg p-1.5 text-navy-400 hover:bg-navy-100 hover:text-navy-600"
              aria-label={isExpanded ? "Show less" : "Show details"}
            >
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
          <p className="mt-2 text-sm text-navy-600">{action.description}</p>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-navy-200 animate-fade-up">
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-500 mb-2">Key Features</p>
              <ul className="space-y-1.5">
                {action.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-navy-700">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={action.href}
                className="mt-4 inline-flex items-center gap-1.5 font-medium text-sm transition-colors"
                style={{ color: action.color.replace("bg-", "text-").replace("100", "600").replace("600", "700") }}
              >
                Open Tool
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {!isExpanded && (
            <Link
              href={action.href}
              className="mt-4 inline-flex items-center gap-1.5 font-medium text-sm transition-colors"
              style={{ color: action.color.replace("bg-", "text-").replace("100", "600").replace("600", "700") }}
            >
              Open Tool
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkflowStep({
  number,
  title,
  description,
  icon,
  color,
}: {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="card-surface p-6 relative">
      <div className="absolute -top-3 left-6 flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-navy-200 text-navy-900 font-bold text-lg">
        {number}
      </div>
      <div className="pt-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
          {icon}
        </div>
        <h3 className="mt-4 font-semibold text-navy-900">{title}</h3>
        <p className="mt-2 text-sm text-navy-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
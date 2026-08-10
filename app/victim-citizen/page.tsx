"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserRound,
  MapPin,
  Search,
  Gavel,
  FileText,
  ArrowRight,
  Loader2,
  ShieldCheck,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Filter,
  X,
  Info,
  Upload,
  FileSearch,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import FileUpload from "@/components/FileUpload";
import SummaryCard from "@/components/SummaryCard";
import DeadlineTracker from "@/components/DeadlineTracker";
import UrgencyBadge from "@/components/UrgencyBadge";
import ChatWidget from "@/components/ChatWidget";
import type { AnalyzeResponseBody } from "@/types";

// ──────────────────────────────────────────────────────────────
// Data
// ──────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman & Nicobar",
  "Chandigarh",
] as const;

type State = (typeof INDIAN_STATES)[number];

interface Scheme {
  id: string;
  title: string;
  description: string;
  category: string;
  link: string;
}

interface Lawyer {
  id: string;
  name: string;
  specialization: string;
  court: string;
  experience: string;
  location: string;
  phone: string;
  email: string;
  link: string;
}

const WB_SCHEMES: Scheme[] = [
  {
    id: "wb-1",
    title: "West Bengal Victim Compensation Scheme",
    description:
      "Financial assistance to victims of crime including acid attacks, sexual assault, and other heinous offences. Covers medical expenses, rehabilitation, and interim compensation.",
    category: "Victim Support",
    link: "https://westbengal.nalsa.gov.in/scheme/wb-victim-compensation-scheme-2017-2/",
  },
  {
    id: "wb-2",
    title: "Legal Aid Defence Counsel Scheme (LADCS)",
    description:
      "Provides dedicated defence counsel for undertrial prisoners who cannot afford legal representation. Ensures effective legal aid at pre-trial, trial, and appellate stages.",
    category: "Criminal Defence",
    link: "https://westbengal.nalsa.gov.in/scheme/guidelines-support-poor-prisoners-scheme/",
  },
  {
    id: "wb-3",
    title: "Nari Shakti Legal Aid Scheme",
    description:
      "Specialized legal assistance for women victims of domestic violence, dowry harassment, sexual assault, and workplace discrimination. Includes counselling and court accompaniment.",
    category: "Women's Rights",
    link: "https://westbengal.nalsa.gov.in/scheme/nalsas-compensation-scheme-for-women-victims-survivors-of-sexual-assault-other-crimes-2018/",
  },
  {
    id: "wb-4",
    title: "Child Legal Aid & Protection Scheme",
    description:
      "Free legal representation for children in conflict with law and children in need of care and protection. Covers JJB, CWC proceedings and rehabilitation.",
    category: "Child Rights",
    link: "https://westbengal.nalsa.gov.in/scheme/nalsa-child-friendly-legal-services-for-children-scheme-2024/",
  },
  {
    id: "wb-5",
    title: "Senior Citizens Legal Aid Scheme",
    description:
      "Priority legal assistance for elderly citizens in property disputes, pension matters, maintenance claims, and elder abuse cases. Includes doorstep legal services.",
    category: "Senior Citizens",
    link: "https://westbengal.nalsa.gov.in/scheme/nalsa-legal-services-to-senior-citizens-scheme-2016/",
  },
  {
    id: "wb-6",
    title: "SC/ST Legal Aid & Atrocities Prevention Scheme",
    description:
      "Comprehensive legal support for Scheduled Caste/Scheduled Tribe communities including atrocity cases, land rights, and enforcement of protective legislation.",
    category: "Marginalized Communities",
    link: "https://westbengal.nalsa.gov.in/scheme/nalsa-samvaad-strengthning-access-to-justice-for-marginalized-vulnurable-adivasis-and-denotified-nomadic-tribes-scheme-2025/",
  },
];

const WB_LAWYERS: Lawyer[] = [
  {
    id: "lawyer-1",
    name: "Adv. Amitava Chatterjee",
    specialization: "Criminal Law, Constitutional Law",
    court: "Calcutta High Court, District Courts",
    experience: "22 years",
    location: "Kolkata, Park Street",
    phone: "+91-33-22XX-XXXX",
    email: "amitava.chatterjee@lawfirm.in",
    link: "hhttps://westbengal.nalsa.gov.in/scheme/scheme-for-para-legal-volunteers/",
  },
  {
    id: "lawyer-2",
    name: "Adv. Priya Banerjee",
    specialization: "Family Law, Domestic Violence, Women's Rights",
    court: "Family Courts Kolkata, Calcutta High Court",
    experience: "15 years",
    location: "Kolkata, Salt Lake",
    phone: "+91-33-23XX-XXXX",
    email: "priya.banerjee@legalhelp.in",
    link: "http://westbengal.nalsa.gov.in/list-of-panel-lawyers/",
  },
  {
    id: "lawyer-3",
    name: "Adv. Rajesh Sharma",
    specialization: "Civil Law, Property Disputes, Land Revenue",
    court: "District Courts North 24 Parganas, Calcutta High Court",
    experience: "18 years",
    location: "Barasat, North 24 Parganas",
    phone: "+91-33-25XX-XXXX",
    email: "rajesh.sharma@advocate.in",
    link: "http://westbengal.nalsa.gov.in/list-of-panel-lawyers/",
  },
  {
    id: "lawyer-4",
    name: "Adv. Suman Das",
    specialization: "Labour Law, Service Matters, Industrial Disputes",
    court: "CAT Kolkata, Calcutta High Court, Labour Courts",
    experience: "12 years",
    location: "Howrah",
    phone: "+91-33-26XX-XXXX",
    email: "suman.das@labourlaw.in",
    link: "http://westbengal.nalsa.gov.in/list-of-panel-lawyers/",
  },
  {
    id: "lawyer-5",
    name: "Adv. Meera Ghosh",
    specialization: "Consumer Protection, Banking, Insurance",
    court: "District Consumer Forums, State Commission, NCDRC",
    experience: "10 years",
    location: "Kolkata, Alipore",
    phone: "+91-33-24XX-XXXX",
    email: "meera.ghosh@consumerlaw.in",
    link: "http://westbengal.nalsa.gov.in/list-of-panel-lawyers/",
  },
];

// ──────────────────────────────────────────────────────────────
// Components
// ──────────────────────────────────────────────────────────────

function StateSelector({
  value,
  onChange,
}: {
  value: State;
  onChange: (state: State) => void;
}) {
  return (
    <div className="relative">
      <label htmlFor="state-select" className="block text-sm font-medium text-navy-700 mb-1.5">
        Select Your State / UT
      </label>
      <div className="relative">
        <select
          id="state-select"
          value={value}
          onChange={(e) => onChange(e.target.value as State)}
          className="input appearance-none pr-10 w-full"
          aria-label="Select state or union territory"
        >
          {INDIAN_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-navy-400 pointer-events-none" />
      </div>
      <p className="mt-1.5 text-xs text-navy-500">
        Currently only West Bengal has live data. Other states coming soon.
      </p>
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
  onClear,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onClear?: () => void;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-navy-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-10 pr-10 w-full"
        aria-label={placeholder}
      />
      {value && onClear && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function SchemeCard({ scheme, searchQuery }: { scheme: Scheme; searchQuery: string }) {
  const matchesSearch =
    !searchQuery ||
    scheme.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scheme.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scheme.category.toLowerCase().includes(searchQuery.toLowerCase());

  if (!matchesSearch) return null;

  const highlight = (text: string) => {
    if (!searchQuery) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <mark key={i} className="bg-gold-200 text-navy-900 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <Link
      href={scheme.link}
      target="_blank"
      rel="noopener noreferrer"
      className="card-surface group p-5 hover:shadow-lg transition-all hover:border-gold-300/50"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <FileText className="h-6 w-6 text-gold-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-navy-900 group-hover:text-gold-700 transition-colors">
              {highlight(scheme.title)}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-navy-100 text-navy-600 font-medium">
              {scheme.category}
            </span>
          </div>
          <p className="mt-2 text-sm text-navy-600 line-clamp-3">{highlight(scheme.description)}</p>
          <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-gold-600 group-hover:text-gold-700">
            View Details
            <ExternalLink className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function LawyerCard({ lawyer, searchQuery }: { lawyer: Lawyer; searchQuery: string }) {
  const matchesSearch =
    !searchQuery ||
    lawyer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lawyer.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lawyer.court.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lawyer.location.toLowerCase().includes(searchQuery.toLowerCase());

  if (!matchesSearch) return null;

  const highlight = (text: string) => {
    if (!searchQuery) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <mark key={i} className="bg-gold-200 text-navy-900 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <div className="card-surface p-5">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy-100 text-navy-700">
            <UserRound className="h-7 w-7" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-navy-900">{highlight(lawyer.name)}</h3>
              <p className="text-sm text-navy-500">{highlight(lawyer.specialization)}</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-gold-500 flex-shrink-0 mt-0.5" aria-label="Verified Panel Lawyer" />
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-navy-600">
            <span className="flex items-center gap-1">
              <Gavel className="h-3.5 w-3.5" />
              {highlight(lawyer.court)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {highlight(lawyer.location)}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              {lawyer.experience} exp.
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-navy-600">
            <a href={`tel:${lawyer.phone}`} className="flex items-center gap-1 hover:text-gold-600 transition-colors">
              📞 {lawyer.phone}
            </a>
            <a href={`mailto:${lawyer.email}`} className="flex items-center gap-1 hover:text-gold-600 transition-colors">
              ✉️ {lawyer.email}
            </a>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-navy-200">
        <Link
          href={lawyer.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-600 hover:text-gold-700"
        >
          View Full Profile on NALSA Portal
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function LegalAidLocator({ selectedState }: { selectedState: State }) {
  const isWestBengal = selectedState === "West Bengal";

  if (!isWestBengal) {
    return (
      <div className="card-surface p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-semibold text-navy-900 mb-2">Coming Soon</h3>
        <p className="text-navy-600 mb-4">
          Legal aid directory for <span className="font-medium">{selectedState}</span> is not yet available.
        </p>
        <p className="text-sm text-navy-500">
          We are working with state legal services authorities to bring you verified information.
        </p>
      </div>
    );
  }

  return (
    <div className="card-surface p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-100 text-gold-600">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-navy-900">West Bengal NALSA</h3>
          <p className="text-sm text-navy-500">West Bengal State Legal Services Authority</p>
        </div>
      </div>
      <p className="text-navy-600 mb-4">
        The West Bengal State Legal Services Authority (WBSLSA) provides free legal aid and services
        to eligible citizens. Access panel lawyers, legal aid schemes, and Lok Adalat information.
      </p>
      <Link
        href="https://westbengal.nalsa.gov.in/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 btn-primary"
      >
        Visit West Bengal NALSA Portal
        <ExternalLink className="h-4 w-4" />
      </Link>
    </div>
  );
}

function SchemesSection({
  selectedState,
  searchQuery,
}: {
  selectedState: State;
  searchQuery: string;
}) {
  const isWestBengal = selectedState === "West Bengal";

  if (!isWestBengal) {
    return (
      <div className="card-surface p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-navy-300 mb-4" />
        <h3 className="text-lg font-semibold text-navy-900 mb-2">Schemes Coming Soon</h3>
        <p className="text-navy-600">
          Government legal aid schemes for <span className="font-medium">{selectedState}</span> will be listed here once available.
        </p>
      </div>
    );
  }

  const filteredSchemes = WB_SCHEMES.filter(
    (s) =>
      !searchQuery ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-navy-900">
          <FileText className="h-5 w-5 text-gold-500" />
          Legal Aid Schemes (West Bengal)
        </h3>
        <span className="text-sm text-navy-500">{filteredSchemes.length} scheme(s) found</span>
      </div>
      {filteredSchemes.length === 0 ? (
        <div className="card-surface p-8 text-center">
          <Search className="mx-auto h-10 w-10 text-navy-300 mb-3" />
          <p className="text-navy-600">No schemes match your search "<span className="font-medium">{searchQuery}</span>"</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSchemes.map((scheme) => (
            <SchemeCard key={scheme.id} scheme={scheme} searchQuery={searchQuery} />
          ))}
        </div>
      )}
    </div>
  );
}

function LawyerRecommendationSection({
  selectedState,
  searchQuery,
  onUseLocation,
  isLocating,
  locationError,
}: {
  selectedState: State;
  searchQuery: string;
  onUseLocation: () => void;
  isLocating: boolean;
  locationError: string | null;
}) {
  const isWestBengal = selectedState === "West Bengal";

  if (!isWestBengal) {
    return (
      <div className="card-surface p-8 text-center">
        <Gavel className="mx-auto h-12 w-12 text-navy-300 mb-4" />
        <h3 className="text-lg font-semibold text-navy-900 mb-2">Lawyer Directory Coming Soon</h3>
        <p className="text-navy-600">
          Verified panel lawyers for <span className="font-medium">{selectedState}</span> will be available here once integrated with the state legal services authority.
        </p>
      </div>
    );
  }

  const filteredLawyers = WB_LAWYERS.filter(
    (l) =>
      !searchQuery ||
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.court.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-gold-500" />
          <h3 className="font-semibold text-navy-900">Panel Lawyers (Kolkata & Surrounding)</h3>
        </div>
        <button
          onClick={onUseLocation}
          disabled={isLocating}
          className="btn-secondary w-full sm:w-auto"
        >
          {isLocating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Locating...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" /> Use My Location
            </>
          )}
        </button>
      </div>

      {locationError && (
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{locationError}</span>
        </div>
      )}

      {isLocating && !locationError && (
        <div className="flex items-center justify-center py-8 text-navy-500">
          <Loader2 className="h-6 w-6 animate-spin text-gold-500 mr-2" />
          <span>Finding lawyers near you...</span>
        </div>
      )}

      {!isLocating && (
        <div className="space-y-3">
          {filteredLawyers.length === 0 ? (
            <div className="card-surface p-8 text-center">
              <Search className="mx-auto h-10 w-10 text-navy-300 mb-3" />
              <p className="text-navy-600">No lawyers match your search "<span className="font-medium">{searchQuery}</span>"</p>
            </div>
          ) : (
            <>
              {filteredLawyers.map((lawyer) => (
                <LawyerCard key={lawyer.id} lawyer={lawyer} searchQuery={searchQuery} />
              ))}
              <div className="text-center pt-2">
                <Link
                  href="http://westbengal.nalsa.gov.in/list-of-panel-lawyers/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 btn-ghost"
                >
                  View All Panel Lawyers on NALSA Portal
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Document Analysis Section (Restored from old implementation)
// ──────────────────────────────────────────────────────────────

function DocumentAnalysisSection() {
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResponseBody | null>(null);
  const [error, setError] = useState("");

  async function analyze(text: string, filename: string, fileBase64?: string) {
    setBusy(true);
    setError("");
    setAnalysis(null);
    try {
      const res = await fetch("/api/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, filename, fileBase64 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AnalyzeResponseBody = await res.json();
      setAnalysis(data);
    } catch {
      setError("Sorry, analysis failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 font-semibold text-navy-900 mb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-gold-300">
          <Upload className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-serif text-2xl font-semibold text-navy-900">Document Analysis</h2>
          <p className="text-sm text-navy-500">Upload a legal notice (PDF, image, or text). Justice AI will read it, flag urgency, track deadlines, and explain in plain language.</p>
        </div>
      </div>

      {/* Upload zone */}
      {!analysis && (
        <div className="mx-auto max-w-xl">
          <FileUpload onAnalyze={analyze} busy={busy} />
          {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
        </div>
      )}

      {/* Loading shimmer */}
      {busy && (
        <div className="flex flex-col items-center justify-center py-16 text-navy-500">
          <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
          <p className="mt-3 text-sm">Reading your notice… this takes a few seconds.</p>
        </div>
      )}

      {/* Analysis dashboard */}
      {analysis && !busy && (
        <div className="space-y-6">
          {/* Top bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-navy-900">
              <FileSearch className="h-6 w-6 text-gold-600" /> Analysis Dashboard
            </h2>
            <div className="flex items-center gap-3">
              <SourcePill source={analysis.source} />
              <button
                onClick={() => setAnalysis(null)}
                className="rounded-xl border border-navy-300 bg-white px-3.5 py-1.5 text-sm font-medium text-navy-600 hover:border-gold-400 hover:text-navy-900"
              >
                Analyze another notice
              </button>
            </div>
          </div>

          {/* Urgency + headline */}
          <div className="card-surface flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Notice urgency</p>
              <div className="mt-1.5">
                <UrgencyBadge urgency={analysis.urgency} />
              </div>
            </div>
            <p className="max-w-sm text-sm text-navy-600">
              Based on the language and deadlines in your notice, we've rated how urgently you should act.
            </p>
          </div>

          {/* Deadline + summary */}
          <div className="grid gap-6 md:grid-cols-2">
            <DeadlineTracker daysToRespond={analysis.daysToRespond} deadlineDate={analysis.deadlineDate} />
            <SummaryCard summary={analysis.summary} />
          </div>

          {/* Key terms */}
          <div className="card-surface p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-navy-500">
              <Info className="h-3.5 w-3.5" /> Key legal terms detected
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {analysis.keyTerms.length > 0 ? (
                analysis.keyTerms.map((t, i) => (
                  <span key={i} className="rounded-lg bg-navy-100 px-3 py-1.5 text-sm font-medium text-navy-700">
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-sm text-navy-400">No specific terms detected.</span>
              )}
            </div>
          </div>

          {/* Demo info note for the redaction toggle */}
          <div className="flex items-start gap-2 rounded-xl border border-gold-200 bg-gold-50/60 p-4 text-sm text-navy-700">
            <Info className="mt-0.5 h-4 w-4 text-gold-600" />
            <p>
              This prototype analyzes the filename or pasted text. Auto-redaction masks Aadhaar/PAN/phone
              patterns client-side before display. Connect a real PDF parser for full extraction.
            </p>
          </div>

          {/* Re-upload row */}
          <div className="mx-auto max-w-xl pt-2">
            <FileUpload onAnalyze={analyze} busy={busy} />
          </div>
        </div>
      )}
    </section>
  );
}

function SourcePill({ source }: { source: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    gemini: { label: "Gemini", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    nemotron: { label: "Nemotron", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
    mock: { label: "Demo mock", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  };
  const s = map[source] || { label: source, cls: "bg-navy-100 text-navy-700 ring-navy-200" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${s.cls}`}>
      ⚡ {s.label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────

export default function CitizenPortalPage() {
  const [selectedState, setSelectedState] = useState<State>("West Bengal");
  const [globalSearch, setGlobalSearch] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleUseLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // In a real app, you'd reverse geocode and find nearby lawyers
        // For now, we just simulate success and show Kolkata lawyers
        setIsLocating(false);
        // Could store coordinates and filter by distance in future
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied. Please enable location permissions in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out. Please try again.");
            break;
          default:
            setLocationError("An unknown error occurred while getting your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const clearSearch = useCallback(() => setGlobalSearch(""), []);

  return (
    <div className="bg-navy-50/40 min-h-screen">
      {/* Header */}
      <section className="border-b border-navy-200/70 bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <span className="eyebrow text-gold-400">Victim / Citizen Portal</span>
          <h1 className="mt-2 flex items-center gap-3 font-serif text-3xl font-bold sm:text-4xl">
            <UserRound className="h-9 w-9 text-gold-300" /> Legal Aid, Document Analysis & Lawyer Finder
          </h1>
          <p className="mt-2 max-w-2xl text-navy-300">
            Upload a legal notice for AI-powered analysis, or browse state legal aid services, government schemes,
            and verified panel lawyers near you. Select your state to get started.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* State Selector + Global Search */}
        <div className="card-surface p-6 mb-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <StateSelector value={selectedState} onChange={setSelectedState} />
            <SearchBox
              value={globalSearch}
              onChange={setGlobalSearch}
              placeholder="Search schemes, lawyers, specialization, court…"
              onClear={globalSearch ? clearSearch : undefined}
            />
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Document Analysis (Restored Feature) */}
          <DocumentAnalysisSection />

          {/* Legal Aid Locator */}
          <section>
            <h2 className="flex items-center gap-2 font-semibold text-navy-900 mb-4">
              <ShieldCheck className="h-5 w-5 text-gold-500" /> Legal Aid Locator
            </h2>
            <LegalAidLocator selectedState={selectedState} />
          </section>

          {/* Schemes */}
          <section>
            <SchemesSection selectedState={selectedState} searchQuery={globalSearch} />
          </section>

          {/* Lawyer Recommendation */}
          <section>
            <h2 className="flex items-center gap-2 font-semibold text-navy-900 mb-4">
              <Gavel className="h-5 w-5 text-gold-500" /> Lawyer Recommendation
            </h2>
            <LawyerRecommendationSection
              selectedState={selectedState}
              searchQuery={globalSearch}
              onUseLocation={handleUseLocation}
              isLocating={isLocating}
              locationError={locationError}
            />
          </section>

          {/* Link to Advanced Citizen Tools */}
          <div className="mt-8 rounded-xl border border-gold-200 bg-gold-50/50 p-6 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-gold-500 mb-3" />
            <h3 className="font-semibold text-navy-900 mb-2">Need More Advanced Tools?</h3>
            <p className="text-navy-600 mb-4 max-w-xl mx-auto">
              Access the Next-Steps Action Tracker, search NALSA-verified panel lawyers with geolocation,
              and use the Voice-Enabled Legal Assistant for hands-free guidance.
            </p>
            <Link
              href="/citizen"
              className="inline-flex items-center gap-2 btn-primary bg-gold-500 hover:bg-gold-600"
            >
              Explore Advanced Tools
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-12 rounded-xl border border-navy-200 bg-white p-6 text-sm text-navy-600">
          <h3 className="font-semibold text-navy-900 mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-gold-500" /> About This Portal
          </h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>Data sourced from <a href="https://nalsa.gov.in/" target="_blank" rel="noopener noreferrer" className="text-gold-600 hover:underline">NALSA</a> and state legal services authorities.</li>
            <li>Currently only <strong>West Bengal</strong> has live data. Other states will be added as APIs become available.</li>
            <li>Lawyer information is from the official panel advocates list. Verify credentials before engagement.</li>
            <li>Geolocation is used only to find nearby lawyers. Your precise location is never stored.</li>
            <li>Document analysis uses AI (Gemini) to extract key information from uploaded legal notices. Results are informational only.</li>
          </ul>
        </div>
      </div>

      {/* Floating chatbot */}
      <ChatWidget persona="citizen" />
    </div>
  );
}
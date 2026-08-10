"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Gavel,
  UserRound,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldCheck,
  CalendarClock,
  Timer,
  Sparkles,
} from "lucide-react";
import type { Urgency } from "@/types";

interface ActionStep {
  id: number;
  title: string;
  description: string;
  daysRemaining: number;
  deadline: string;
  urgency: Urgency;
  icon: React.ReactNode;
  category: string;
  completed: boolean;
  details?: string[];
}

const STEP_ICONS = {
  1: <FileText className="h-5 w-5" />,
  2: <Gavel className="h-5 w-5" />,
  3: <UserRound className="h-5 w-5" />,
};

const URGENCY_STYLES: Record<Urgency, { bg: string; text: string; ring: string; icon: typeof AlertTriangle; label: string }> = {
  High: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200", icon: AlertTriangle, label: "High urgency" },
  Medium: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", icon: AlertCircle, label: "Medium urgency" },
  Low: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", icon: ShieldCheck, label: "Low urgency" },
};

const DEFAULT_STEPS: ActionStep[] = [
  {
    id: 1,
    title: "Send Reply to Legal Notice",
    description: "Draft and send a formal written reply to the sender's address within the statutory period. This prevents ex-parte proceedings against you.",
    daysRemaining: 15,
    deadline: "25 August 2026",
    urgency: "High",
    icon: <FileText className="h-5 w-5" />,
    category: "Immediate Response",
    completed: false,
    details: [
      "Review the notice carefully with a lawyer",
      "Prepare a point-wise response addressing each allegation",
      "Send via registered post with acknowledgment due",
      "Keep copies of all correspondence",
    ],
  },
  {
    id: 2,
    title: "File Caveat Petition",
    description: "File a caveat in the relevant court to ensure you are heard before any interim order is passed against you. Valid for 90 days.",
    daysRemaining: 30,
    deadline: "9 September 2026",
    urgency: "Medium",
    icon: <Gavel className="h-5 w-5" />,
    category: "Protective Filing",
    completed: false,
    details: [
      "Identify the correct court jurisdiction",
      "Draft caveat petition with affidavit",
      "Pay court fees (typically ₹100-500)",
      "Serve notice to the opposing party",
    ],
  },
  {
    id: 3,
    title: "Consult an Advocate",
    description: "Schedule a consultation with a qualified advocate specializing in the relevant area of law to assess your case strength and strategy.",
    daysRemaining: 45,
    deadline: "24 September 2026",
    urgency: "Medium",
    icon: <UserRound className="h-5 w-5" />,
    category: "Legal Strategy",
    completed: false,
    details: [
      "Shortlist 2-3 advocates from NALSA panel",
      "Prepare case summary and documents",
      "Discuss fee structure and timeline",
      "Decide on representation strategy",
    ],
  },
  {
    id: 4,
    title: "Gather Supporting Documents",
    description: "Collect all relevant documents, evidence, contracts, communications, and records that support your position in the matter.",
    daysRemaining: 20,
    deadline: "30 August 2026",
    urgency: "High",
    icon: <Sparkles className="h-5 w-5" />,
    category: "Evidence Collection",
    completed: false,
    details: [
      "Original contracts/agreements",
      "Communication records (emails, messages)",
      "Financial records and receipts",
      "Witness contact information",
      "Previous court orders if any",
    ],
  },
  {
    id: 5,
    title: "Prepare for Mediation/Lok Adalat",
    description: "Explore alternative dispute resolution through mediation or Lok Adalat for faster, cost-effective resolution before trial.",
    daysRemaining: 60,
    deadline: "9 October 2026",
    urgency: "Low",
    icon: <ShieldCheck className="h-5 w-5" />,
    category: "Alternative Resolution",
    completed: false,
    details: [
      "Check if matter is eligible for Lok Adalat",
      "Apply for mediation through court",
      "Prepare settlement proposals",
      "Attend mediation sessions in good faith",
    ],
  },
];

export default function ActionTrackerPage() {
  const [steps, setSteps] = useState<ActionStep[]>(DEFAULT_STEPS);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "urgent">("all");
  const [showCompleted, setShowCompleted] = useState(true);

  const filteredSteps = steps.filter((step) => {
    if (filter === "completed") return step.completed;
    if (filter === "pending") return !step.completed;
    if (filter === "urgent") return step.urgency === "High" && !step.completed;
    return true;
  });

  const completedCount = steps.filter((s) => s.completed).length;
  const pendingCount = steps.filter((s) => !s.completed).length;
  const highUrgencyCount = steps.filter((s) => s.urgency === "High" && !s.completed).length;

  const toggleStep = (id: number) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)));
  };

  const toggleExpand = (id: number) => {
    setExpandedStep((prev) => (prev === id ? null : id));
  };

  const formatDays = (days: number) => {
    if (days <= 0) return "Overdue";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

  const getProgressColor = () => {
    const total = steps.length;
    const done = completedCount;
    if (done === 0) return "bg-navy-200";
    if (done === total) return "bg-emerald-500";
    if (done / total >= 0.66) return "bg-gold-500";
    if (done / total >= 0.33) return "bg-blue-500";
    return "bg-amber-500";
  };

  return (
    <div className="bg-navy-50/40 min-h-screen">
      {/* Header */}
      <section className="border-b border-navy-200/70 bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <span className="eyebrow text-gold-400">Citizen Portal</span>
          <h1 className="mt-2 flex items-center gap-3 font-serif text-3xl font-bold sm:text-4xl">
            <CalendarClock className="h-9 w-9 text-gold-300" />
            Next-Steps Action Tracker
          </h1>
          <p className="mt-2 max-w-2xl text-navy-300">
            Visual roadmap for your legal notice response. Track deadlines, urgency levels, and progress — never miss a critical date.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Progress Header */}
        <div className="card-surface p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-navy-900">Your Action Roadmap</h2>
              <p className="mt-1 text-navy-600">Based on your legal notice analysis — {highUrgencyCount} high-priority item{highUrgencyCount !== 1 ? "s" : ""} requiring immediate attention</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {/* Progress bar */}
              <div className="w-full md:w-64">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-navy-600">Overall Progress</span>
                  <span className="font-semibold text-navy-900">{Math.round((completedCount / steps.length) * 100)}%</span>
                </div>
                <div className="h-3 rounded-full bg-navy-100 overflow-hidden">
                  <div className={`h-full ${getProgressColor()} transition-all duration-500`} style={{ width: `${(completedCount / steps.length) * 100}%` }} />
                </div>
              </div>
              {/* Stats */}
              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle className="h-4 w-4" /> {completedCount} done
                </div>
                <div className="flex items-center gap-1.5 text-navy-600">
                  <Clock className="h-4 w-4" /> {pendingCount} pending
                </div>
                <div className="flex items-center gap-1.5 text-red-600">
                  <AlertTriangle className="h-4 w-4" /> {highUrgencyCount} urgent
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap gap-2">
            {(["all", "urgent", "pending", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                  filter === f
                    ? "bg-navy-900 text-white shadow-sm"
                    : "bg-navy-100 text-navy-600 hover:bg-gold-100 hover:text-gold-800"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <label className="flex items-center gap-2 ml-auto text-sm text-navy-600">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded border-navy-300 text-gold-500 focus:ring-gold-500"
              />
              Show completed
            </label>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          {filteredSteps.map((step, index) => {
            const isOverdue = step.daysRemaining <= 0;
            const isUrgent = step.urgency === "High" && !step.completed;
            const urgencyStyle = URGENCY_STYLES[step.urgency];
            const UrgencyIcon = urgencyStyle.icon;

            return (
              <div
                key={step.id}
                className={`relative card-surface overflow-hidden transition-all ${
                  step.completed ? "opacity-60 bg-emerald-50/30" : ""
                } ${isUrgent ? "ring-2 ring-red-200" : ""}`}
              >
                {/* Vertical line connector */}
                <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-navy-100" />
                {index < filteredSteps.length - 1 && (
                  <div className="absolute left-10 bottom-0 w-0.5 h-1/2 bg-navy-100" />
                )}

                <div className="relative flex gap-4 p-5">
                  {/* Step number & status */}
                  <div className="flex-shrink-0 relative z-10">
                    <div className="flex flex-col items-center gap-2">
                      {/* Status circle */}
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                          step.completed
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : isUrgent
                            ? "bg-red-50 border-red-300 text-red-500"
                            : "bg-white border-navy-200 text-navy-400"
                        }`}
                      >
                        {step.completed ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <span className="font-bold text-lg">{step.id}</span>
                        )}
                      </div>
                      {/* Urgency badge */}
                      {!step.completed && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${urgencyStyle.bg} ${urgencyStyle.text} ${urgencyStyle.ring}`}>
                          <UrgencyIcon className="h-2.5 w-2.5" />
                          {urgencyStyle.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-100 text-navy-700">
                            {step.icon}
                          </span>
                          <div>
                            <h3 className="font-semibold text-navy-900">{step.title}</h3>
                            <p className="text-xs text-navy-500">{step.category}</p>
                          </div>
                        </div>
                        <p className="ml-10 text-sm text-navy-600 line-clamp-2">{step.description}</p>
                      </div>

                      {/* Deadline info */}
                      <div className="flex-shrink-0 text-right">
                        <div className={`flex items-center justify-end gap-1.5 ${isOverdue ? "text-red-600" : step.daysRemaining <= 7 ? "text-amber-600" : "text-navy-700"}`}>
                          <CalendarClock className="h-4 w-4" />
                          <span className="font-semibold">{isOverdue ? "Overdue" : formatDays(step.daysRemaining)}</span>
                        </div>
                        <p className="ml-5.5 text-xs text-navy-500">Due: {step.deadline}</p>
                        {step.daysRemaining > 0 && step.daysRemaining <= 7 && !isOverdue && (
                          <span className="ml-5.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                            <Timer className="h-3 w-3" /> Act soon
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expandable details */}
                    <button
                      onClick={() => toggleExpand(step.id)}
                      className="mt-3 flex items-center gap-1.5 text-sm text-gold-600 hover:text-gold-700 transition-colors"
                    >
                      {expandedStep === step.id ? (
                        <>
                          <ChevronUp className="h-4 w-4" /> Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" /> Show details & checklist
                        </>
                      )}
                    </button>

                    {expandedStep === step.id && step.details && (
                      <div className="mt-3 ml-10 space-y-2 border-l-2 border-gold-200 pl-4">
                        {step.details.map((detail, i) => (
                          <label key={i} className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 rounded border-navy-300 text-gold-500 focus:ring-gold-500"
                              onChange={() => {}}
                            />
                            <span className="text-sm text-navy-700">{detail}</span>
                          </label>
                        ))}
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => toggleStep(step.id)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                              step.completed
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                : "bg-gold-500 text-navy-950 hover:bg-gold-400"
                            }`}
                          >
                            {step.completed ? (
                              <>
                                <CheckCircle className="h-4 w-4" /> Mark Incomplete
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" /> Mark Complete
                              </>
                            )}
                          </button>
                          <span className="text-xs text-navy-500">
                            {step.completed ? "✓ Completed" : "Pending action"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredSteps.length === 0 && (
            <div className="card-surface p-12 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-navy-300 mb-4" />
              <h3 className="text-lg font-semibold text-navy-900 mb-2">No steps found</h3>
              <p className="text-navy-600">Try changing the filter or add a new action step.</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <button className="card-surface p-6 text-left hover:border-gold-300/50 hover:shadow-lg transition-all group">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-100 text-gold-600 group-hover:bg-gold-500 group-hover:text-white transition-colors">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-900">Generate Reply Draft</h3>
                <p className="text-sm text-navy-500">AI-assisted formal reply template</p>
              </div>
            </div>
            <ArrowRight className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-navy-300 group-hover:text-gold-500 transition-colors" />
          </button>

          <button className="card-surface p-6 text-left hover:border-gold-300/50 hover:shadow-lg transition-all group">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Gavel className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-900">File Caveat Online</h3>
                <p className="text-sm text-navy-500">E-filing portal integration</p>
              </div>
            </div>
            <ArrowRight className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-navy-300 group-hover:text-gold-500 transition-colors" />
          </button>

          <button className="card-surface p-6 text-left hover:border-gold-300/50 hover:shadow-lg transition-all group">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-900">Find Nearby Lawyer</h3>
                <p className="text-sm text-navy-500">Geolocation-based panel advocates</p>
              </div>
            </div>
            <ArrowRight className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-navy-300 group-hover:text-gold-500 transition-colors" />
          </button>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              <strong>Disclaimer:</strong> This action tracker is generated based on common legal notice patterns and statutory timelines.
              Actual deadlines may vary based on the specific notice, jurisdiction, and applicable law.
              <strong>Always consult a qualified advocate for personalized legal advice.</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState, useMemo } from "react";
import {
  Briefcase,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Gavel,
  MessageSquare,
  Download,
  Copy,
  CheckCircle,
  X,
  Tag,
  Loader2,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface CaseBrief {
  caseId: string;
  clientName: string;
  matterType: string;
  urgency: "High" | "Medium" | "Low";
  keyFacts: string[];
  legalIssues: string[];
  chronology: { date: string; event: string; source: string }[];
  parties: { name: string; role: string; contact?: string }[];
  deadlines: { description: string; date: string; status: "pending" | "met" | "missed" }[];
  tags: string[];
  summary: string;
  generatedAt: string;
}

interface ChatSession {
  id: string;
  clientName: string;
  startTime: string;
  messageCount: number;
  messages: ChatMessage[];
  tags?: string[];
}

const MOCK_CHAT_SESSIONS: ChatSession[] = [
  {
    id: "chat-001",
    clientName: "Ramesh Kumar",
    startTime: "2026-08-01T10:30:00",
    messageCount: 12,
    messages: [
      { role: "user", content: "I received a legal notice from my former employer regarding a non-compete clause. They claim I violated it by joining a competitor.", timestamp: "2026-08-01T10:30:00" },
      { role: "assistant", content: "I understand. Let me help you understand your legal notice. Can you share the key dates mentioned in the notice?", timestamp: "2026-08-01T10:31:00" },
      { role: "user", content: "The notice is dated 28th July 2026. They want a response within 15 days. My last day at the old company was 15th June 2026, and I joined the new company on 1st July 2026.", timestamp: "2026-08-01T10:32:00" },
      { role: "assistant", content: "Thanks. The notice gives you until 12th August 2026 to respond. The non-compete clause typically restricts joining competitors for 6-12 months. Since you joined on 1st July, this is within the restriction period.", timestamp: "2026-08-01T10:33:00" },
      { role: "user", content: "But the non-compete clause in my contract says 12 months and covers all of India. That seems too broad.", timestamp: "2026-08-01T10:34:00" },
      { role: "assistant", content: "You're right - Indian courts often strike down overly broad non-compete clauses. Section 27 of the Indian Contract Act voids agreements in restraint of trade, except reasonable restrictions. A pan-India 12-month ban may be unreasonable.", timestamp: "2026-08-01T10:35:00" },
      { role: "user", content: "My salary was ₹85,000/month. The notice also demands ₹5 lakhs as damages.", timestamp: "2026-08-01T10:36:00" },
      { role: "assistant", content: "The damages claim of ₹5 lakhs needs to be substantiated. Under Section 73 of the Contract Act, damages must be actual loss, not penal. What's the nature of your work at the new company?", timestamp: "2026-08-01T10:37:00" },
      { role: "user", content: "I'm a senior software engineer. The new company works in fintech, my old company was in ed-tech. Different domains.", timestamp: "2026-08-01T10:38:00" },
      { role: "assistant", content: "Different domains (ed-tech vs fintech) weakens their case. Courts consider whether there's actual competition. Also, as an employee (not a partner/seller), restrictions are viewed more strictly.", timestamp: "2026-08-01T10:39:00" },
      { role: "user", content: "The notice mentions they'll file for injunction if I don't respond.", timestamp: "2026-08-01T10:40:00" },
      { role: "assistant", content: "An injunction is possible but they'd need to show irreparable harm and prima facie case. The different domains and unreasonable clause work in your favor. You should file a reply before 12th August.", timestamp: "2026-08-01T10:41:00" },
      { role: "user", content: "What should my reply include?", timestamp: "2026-08-01T10:42:00" },
      { role: "assistant", content: "Your reply should: 1) Deny violation - different domains, 2) Challenge clause validity - unreasonable restraint under S.27 ICA, 3) No damages proof, 4) Reserve rights to counter-claim for harassment. Consult an advocate for drafting.", timestamp: "2026-08-01T10:43:00" },
    ],
    tags: ["employment", "non-compete", "contract-law", "injunction"],
  },
  {
    id: "chat-002",
    clientName: "Priya Sharma",
    startTime: "2026-07-28T14:15:00",
    messageCount: 8,
    messages: [
      { role: "user", content: "My husband filed for divorce on grounds of cruelty. We have a 5-year-old daughter. He earns ₹2 lakhs/month, I'm a homemaker.", timestamp: "2026-07-28T14:15:00" },
      { role: "assistant", content: "I'm sorry to hear this. For divorce cases, key issues are: child custody, maintenance (Section 125 CrPC / Section 144 BNSS), and property division. What's your primary concern?", timestamp: "2026-07-28T14:16:00" },
      { role: "user", content: "I want custody of our daughter and maintenance. He's threatening to take her away.", timestamp: "2026-07-28T14:17:00" },
      { role: "assistant", content: "Courts prefer mother's custody for young children (tender years doctrine). For maintenance, you can file under Section 125 CrPC - interim maintenance can be granted quickly. He cannot take the child without court order.", timestamp: "2026-07-28T14:18:00" },
      { role: "user", content: "We have a flat in Gurgaon bought jointly. He wants me to sign it over.", timestamp: "2026-07-28T14:19:00" },
      { role: "assistant", content: "Don't sign anything without legal advice. Joint property means 50% share. You can claim your share or right to residence. Stridhan (jewelry, gifts) is exclusively yours.", timestamp: "2026-07-28T14:20:00" },
      { role: "user", content: "He filed in Delhi Family Court. I'm in Mumbai.", timestamp: "2026-07-28T14:21:00" },
      { role: "assistant", content: "You can file transfer petition to move case to Mumbai (wife's residence). Or engage a Delhi advocate. Video conferencing is allowed in family courts post-COVID.", timestamp: "2026-07-28T14:22:00" },
      { role: "user", content: "What documents do I need?", timestamp: "2026-07-28T14:23:00" },
      { role: "assistant", content: "Marriage certificate, daughter's birth certificate, property documents, bank statements, proof of husband's income, any evidence of cruelty (messages, medical records, witnesses).", timestamp: "2026-07-28T14:24:00" },
    ],
    tags: ["family-law", "divorce", "custody", "maintenance", "property"],
  },
];

const generateCaseBrief = (session: ChatSession): CaseBrief => {
  const clientName = session.clientName;
  const messages = session.messages;
  const userMessages = messages.filter(m => m.role === "user");
  const assistantMessages = messages.filter(m => m.role === "assistant");

  // Extract key facts from user messages
  const keyFacts = userMessages.slice(0, 5).map(m => m.content);

  // Extract legal issues from assistant messages
  const legalIssues = assistantMessages
    .flatMap(m => m.content.match(/\b(Section|Act|Article|clause|doctrine|principle)\b/gi) || [])
    .slice(0, 5);

  // Determine matter type from tags
  const matterType = session.tags?.[0]?.replace("-", " ") || "General Legal Matter";

  // Determine urgency based on deadlines mentioned
  let urgency: "High" | "Medium" | "Low" = "Medium";
  const allText = messages.map(m => m.content).join(" ");
  if (allText.match(/15 days|urgent|injunction|immediate|tomorrow|asap/i)) urgency = "High";
  else if (allText.match(/30 days|month|soon/i)) urgency = "Medium";
  else urgency = "Low";

  // Build chronology
  const chronology = messages.map(m => ({
    date: m.timestamp.split("T")[0],
    event: m.role === "user" ? `Client: ${m.content.slice(0, 80)}...` : `AI: ${m.content.slice(0, 80)}...`,
    source: m.role === "user" ? "Client Chat" : "AI Analysis",
  }));

  // Build deadlines from conversation
  const deadlines = [];
  if (allText.match(/15 days|12th August/i)) {
    deadlines.push({ description: "Reply to legal notice", date: "2026-08-12", status: "pending" as const });
  }
  if (allText.match(/injunction/i)) {
    deadlines.push({ description: "Respond before injunction hearing", date: "2026-08-15", status: "pending" as const });
  }

  return {
    caseId: `CB-${session.id.slice(-3)}-${Date.now().toString(36).toUpperCase()}`,
    clientName,
    matterType: matterType.charAt(0).toUpperCase() + matterType.slice(1),
    urgency,
    keyFacts,
    legalIssues: Array.from(new Set(legalIssues)).slice(0, 5),
    chronology,
    parties: [
      { name: clientName, role: "Client", contact: "From chat session" },
      { name: "Opposing Party", role: "Adverse Party", contact: "Details in notice" },
    ],
    deadlines,
    tags: session.tags || [],
    summary: assistantMessages.slice(-1)[0]?.content?.slice(0, 300) || "Case brief generated from chat history.",
    generatedAt: new Date().toISOString(),
  };
};

export default function CasesPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [generatedBrief, setGeneratedBrief] = useState<CaseBrief | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showChatPreview, setShowChatPreview] = useState<string | null>(null);

  const selectedSession = useMemo(
    () => MOCK_CHAT_SESSIONS.find(s => s.id === selectedSessionId),
    [selectedSessionId]
  );

  const handleGenerateBrief = async (session: ChatSession) => {
    setIsGenerating(true);
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    const brief = generateCaseBrief(session);
    setGeneratedBrief(brief);
    setIsGenerating(false);
  };

  if (!selectedSessionId) {
    return (
      <div className="bg-navy-50/40 min-h-screen">
        {/* Header */}
        <section className="border-b border-navy-200/70 bg-navy-900 text-white">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <span className="eyebrow text-gold-400">Advocate Portal</span>
            <h1 className="mt-2 flex items-center gap-3 font-serif text-3xl font-bold">
              <Briefcase className="h-9 w-9 text-gold-300" />
              Smart Intake Synthesizer
            </h1>
            <p className="mt-2 max-w-2xl text-navy-300">
              Auto-generate structured Case Briefs from citizen chat history.
              Select a chat session to analyze and create a chronological, tagged case summary.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-10">
          {/* Sessions Grid */}
          <div className="card-surface p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-navy-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-gold-500" />
                Available Chat Sessions
              </h2>
              <span className="text-sm text-navy-500">{MOCK_CHAT_SESSIONS.length} sessions</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {MOCK_CHAT_SESSIONS.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onClick={() => setSelectedSessionId(session.id)}
                  onPreview={() => setShowChatPreview(session.id)}
                />
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <FeatureCard icon={FileText} title="Auto-structured Brief" desc="Chronological case summary with key facts, legal issues, parties, and deadlines extracted from chat." />
            <FeatureCard icon={Tag} title="Smart Tagging" desc="Automatic categorization by matter type, urgency, and legal domain for easy case management." />
            <FeatureCard icon={ShieldCheck} title="Deadline Tracking" desc="Critical dates identified and flagged with status tracking for compliance." />
          </div>
        </div>
      </div>
    );
  }

  // Detail view with generated brief
  return (
    <div className="bg-navy-50/40 min-h-screen">
      {/* Header */}
      <section className="border-b border-navy-200/70 bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setSelectedSessionId(null); setGeneratedBrief(null); }}
                className="rounded-lg p-2 text-navy-300 hover:bg-white/10 hover:text-white"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
              <h1 className="font-serif text-2xl font-bold">
                <Briefcase className="h-8 w-8 text-gold-300 inline" />
                Case Brief: {selectedSession?.clientName}
              </h1>
            </div>
            {generatedBrief && (
              <div className="flex items-center gap-2">
                <button className="btn-secondary" onClick={() => downloadBrief(generatedBrief)}>
                  <Download className="h-4 w-4" /> Download
                </button>
                <button className="btn-secondary" onClick={() => copyBrief(generatedBrief)}>
                  <Copy className="h-4 w-4" /> Copy
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {isGenerating ? (
          <GeneratingState />
        ) : generatedBrief ? (
          <CaseBriefView brief={generatedBrief} onRegenerate={() => handleGenerateBrief(selectedSession!)} />
        ) : (
          <SessionDetailView
            session={selectedSession!}
            onGenerate={handleGenerateBrief}
            onBack={() => setSelectedSessionId(null)}
            onPreview={() => setShowChatPreview(selectedSession!.id)}
          />
        )}
      </div>

      {/* Chat Preview Modal */}
      {showChatPreview && (
        <ChatPreviewModal
          session={MOCK_CHAT_SESSIONS.find(s => s.id === showChatPreview)!}
          onClose={() => setShowChatPreview(null)}
        />
      )}
    </div>
  );
}

function SessionCard({ session, onClick, onPreview }: { session: ChatSession; onClick: () => void; onPreview: () => void }) {
  const startDate = new Date(session.startTime).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div
      onClick={onClick}
      className="card-surface p-5 cursor-pointer hover:border-gold-300/50 hover:shadow-lg transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-100 text-gold-600">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-navy-900">{session.clientName}</h3>
            <p className="text-xs text-navy-500">{startDate} · {session.messageCount} messages</p>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onPreview(); }} className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-100 hover:text-navy-600">
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {session.tags?.slice(0, 3).map(tag => (
          <span key={tag} className="rounded-full bg-navy-100 px-2 py-0.5 text-xs text-navy-600">{tag}</span>
        ))}
        {session.tags && session.tags.length > 3 && (
          <span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs text-navy-500">+{session.tags.length - 3} more</span>
        )}
      </div>
      <button className="btn-primary w-full text-sm">Generate Case Brief</button>
    </div>
  );
}

function SessionDetailView({ session, onGenerate, onBack, onPreview }: { session: ChatSession; onGenerate: (session: ChatSession) => void; onBack: () => void; onPreview: () => void }) {
  return (
    <div className="card-surface p-6">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-700">
        <ChevronDown className="h-4 w-4" /> Back to sessions
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Session Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-navy-50/50 rounded-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-100 text-gold-600">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-900">{session.clientName}</h3>
              <p className="text-sm text-navy-500">Chat session · {new Date(session.startTime).toLocaleString("en-IN")}</p>
            </div>
          </div>

          <div className="card-surface p-4">
            <h4 className="font-semibold text-navy-900 mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4 text-gold-500" /> Tags & Categories
            </h4>
            <div className="flex flex-wrap gap-2">
              {session.tags?.map(tag => (
                <span key={tag} className="rounded-full bg-gold-50 px-2.5 py-1 text-sm font-medium text-gold-700">{tag}</span>
              ))}
            </div>
          </div>

          <div className="card-surface p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-navy-900">Conversation Preview</h4>
              <button onClick={onPreview} className="text-sm text-gold-600 hover:underline">View full chat</button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {session.messages.slice(0, 6).map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === "user" ? "bg-gold-500 text-navy-950" : "bg-white text-navy-800 ring-1 ring-navy-200"
                  }`}>
                    {msg.content.slice(0, 120)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="space-y-4">
          <div className="card-surface p-5 border-l-4 border-gold-500">
            <h4 className="font-semibold text-navy-900 mb-2">Ready to Generate</h4>
            <p className="text-sm text-navy-600 mb-4">AI will analyze the conversation and create a structured case brief with:</p>
            <ul className="space-y-2 text-sm text-navy-700">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Key facts chronology</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Legal issues identified</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Parties & contacts</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Critical deadlines</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Urgency assessment</li>
            </ul>
            <button onClick={() => onGenerate(session)} className="btn-primary w-full mt-4">
              <Loader2 className="h-4 w-4" /> Generate Case Brief
            </button>
          </div>

          <div className="card-surface p-4">
            <h4 className="font-semibold text-navy-900 mb-3">Session Stats</h4>
            <div className="space-y-2 text-sm">
              <StatRow label="Messages" value={session.messageCount.toString()} />
              <StatRow label="User messages" value={session.messages.filter(m => m.role === "user").length.toString()} />
              <StatRow label="AI responses" value={session.messages.filter(m => m.role === "assistant").length.toString()} />
              <StatRow label="Tags" value={(session.tags?.length || 0).toString()} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CaseBriefView({ brief, onRegenerate }: { brief: CaseBrief; onRegenerate: () => void }) {
  const urgencyStyles = {
    High: "bg-red-50 text-red-700 ring-red-200",
    Medium: "bg-amber-50 text-amber-700 ring-amber-200",
    Low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-surface p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs font-semibold text-navy-700">{brief.caseId}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${urgencyStyles[brief.urgency]}`}>
                <AlertTriangle className="h-3 w-3" /> {brief.urgency} Urgency
              </span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-navy-900">{brief.clientName} — {brief.matterType}</h2>
            <p className="mt-1 text-sm text-navy-500">Generated {new Date(brief.generatedAt).toLocaleString("en-IN")}</p>
          </div>
          <button onClick={onRegenerate} className="btn-secondary">
            <Loader2 className="h-4 w-4" /> Regenerate
          </button>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary */}
          <div className="card-surface p-5">
            <h3 className="font-semibold text-navy-900 mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gold-500" /> Case Summary
            </h3>
            <p className="text-navy-700 leading-relaxed">{brief.summary}</p>
          </div>

          {/* Key Facts */}
          <div className="card-surface p-5">
            <h3 className="font-semibold text-navy-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-gold-500" /> Key Facts
            </h3>
            <ol className="space-y-2">
              {brief.keyFacts.map((fact, i) => (
                <li key={i} className="flex gap-3 text-sm text-navy-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-xs font-bold text-gold-700">{i + 1}</span>
                  <span>{fact}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Legal Issues */}
          <div className="card-surface p-5">
            <h3 className="font-semibold text-navy-900 mb-3 flex items-center gap-2">
              <Gavel className="h-5 w-5 text-gold-500" /> Legal Issues Identified
            </h3>
            <div className="flex flex-wrap gap-2">
              {brief.legalIssues.length > 0 ? (
                brief.legalIssues.map(issue => (
                  <span key={issue} className="rounded-lg bg-navy-100 px-3 py-1 text-sm font-medium text-navy-700">{issue}</span>
                ))
              ) : (
                <span className="text-sm text-navy-500">Review chat for specific legal provisions</span>
              )}
            </div>
          </div>

          {/* Chronology */}
          <div className="card-surface p-5">
            <h3 className="font-semibold text-navy-900 mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gold-500" /> Chronology
            </h3>
            <div className="space-y-3">
              {brief.chronology.map((entry, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="flex-shrink-0 w-24 text-navy-500">{entry.date}</div>
                  <div className="flex-1 border-l border-navy-200 pl-3">
                    <p className={entry.source === "Client Chat" ? "text-navy-700" : "text-gold-700 font-medium"}>{entry.event}</p>
                    <p className="text-xs text-navy-400">{entry.source}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Parties */}
          <div className="card-surface p-5">
            <h3 className="font-semibold text-navy-900 mb-3 flex items-center gap-2">
              <User className="h-5 w-5 text-gold-500" /> Parties
            </h3>
            <div className="space-y-3">
              {brief.parties.map((party, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-navy-50/50 rounded-lg">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-100 text-gold-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-navy-900">{party.name}</p>
                    <p className="text-xs text-navy-500">{party.role}</p>
                    {party.contact && <p className="text-xs text-navy-400">{party.contact}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deadlines */}
          <div className="card-surface p-5">
            <h3 className="font-semibold text-navy-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" /> Deadlines
            </h3>
            <div className="space-y-3">
              {brief.deadlines.length > 0 ? (
                brief.deadlines.map((dl, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-navy-50/50 rounded-lg">
                    <div>
                      <p className="font-medium text-navy-900">{dl.description}</p>
                      <p className="text-sm text-navy-500">By {new Date(dl.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      dl.status === "pending" ? "bg-amber-100 text-amber-700" :
                      dl.status === "met" ? "bg-emerald-100 text-emerald-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {dl.status.charAt(0).toUpperCase() + dl.status.slice(1)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-navy-500 text-center py-4">No critical deadlines identified</p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="card-surface p-5">
            <h3 className="font-semibold text-navy-900 mb-3 flex items-center gap-2">
              <Tag className="h-5 w-5 text-gold-500" /> Case Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {brief.tags.map(tag => (
                <span key={tag} className="rounded-full bg-gold-50 px-2.5 py-1 text-sm font-medium text-gold-700">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Loader2 className="h-12 w-12 animate-spin text-gold-500" />
      <h3 className="mt-4 font-serif text-xl font-semibold text-navy-900">Generating Case Brief</h3>
      <p className="mt-2 text-navy-500">AI is analyzing the chat history and structuring the case brief...</p>
      <div className="mt-6 flex items-center justify-center gap-1">
        {["Analyzing messages", "Extracting facts", "Identifying issues", "Building chronology", "Finalizing brief"].map((step, i) => (
          <div key={i} className="h-2 w-20 rounded-full bg-navy-100 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </div>
    </div>
  );
}

function ChatPreviewModal({ session, onClose }: { session: ChatSession; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl overflow-hidden animate-fade-up">
        <div className="flex items-center justify-between border-b border-navy-200 bg-navy-900 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gold-300" />
            <span className="font-semibold">{session.clientName} — Chat History</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3 max-h-[60vh]">
          {session.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user" ? "bg-gold-500 text-navy-950" : "bg-white text-navy-800 ring-1 ring-navy-200"
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className={`mt-1 text-xs ${msg.role === "user" ? "text-navy-800/70" : "text-navy-400"}`}>
                  {new Date(msg.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-navy-200 px-4 py-3 text-right">
          <button onClick={onClose} className="btn-primary">Close</button>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="card-surface p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-100 text-gold-600 mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-semibold text-navy-900 mb-1">{title}</h3>
      <p className="text-sm text-navy-600">{desc}</p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-navy-500">{label}</span>
      <span className="font-semibold text-navy-900">{value}</span>
    </div>
  );
}

function downloadBrief(brief: CaseBrief) {
  const content = `CASE BRIEF: ${brief.caseId}
Client: ${brief.clientName}
Matter: ${brief.matterType}
Urgency: ${brief.urgency}
Generated: ${new Date(brief.generatedAt).toLocaleString("en-IN")}

SUMMARY:
${brief.summary}

KEY FACTS:
${brief.keyFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

LEGAL ISSUES:
${brief.legalIssues.join(", ")}

CHRONOLOGY:
${brief.chronology.map(c => `[${c.date}] ${c.source}: ${c.event}`).join("\n")}

PARTIES:
${brief.parties.map(p => `${p.name} (${p.role})`).join("\n")}

DEADLINES:
${brief.deadlines.map(d => `${d.description} — Due: ${d.date} (${d.status})`).join("\n")}

TAGS: ${brief.tags.join(", ")}`;

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${brief.caseId}-${brief.clientName.replace(/\s+/g, "_")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function copyBrief(brief: CaseBrief) {
  const content = `CASE BRIEF: ${brief.caseId} — ${brief.clientName} (${brief.matterType})
Urgency: ${brief.urgency}
Summary: ${brief.summary}
Key Facts: ${brief.keyFacts.length} extracted
Legal Issues: ${brief.legalIssues.join(", ")}
Deadlines: ${brief.deadlines.length} tracked
Tags: ${brief.tags.join(", ")}`;

  navigator.clipboard.writeText(content);
  alert("Case brief copied to clipboard!");
}
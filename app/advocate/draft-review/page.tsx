"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  FileSearch,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  X,
  FileText,
  Eye,
  EyeOff,
  Highlighter,
  Flag,
  MessageSquare,
  Type,
  BookOpen,
} from "lucide-react";

interface Anomaly {
  id: string;
  type: "loophole" | "one-sided" | "missing-protection" | "ambiguity" | "risk";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  location: { page: number; paragraph: number };
  originalText: string;
  suggestion: string;
  lawReference?: string;
}

interface OCRResult {
  pages: number;
  text: string;
  confidence: number;
  scanned: boolean;
}

const MOCK_ANOMALIES: Anomaly[] = [
  {
    id: "a1",
    type: "loophole",
    severity: "high",
    title: "Unilateral Termination Clause",
    description: "Clause 7.2 allows either party to terminate with 30 days notice, but only the service provider (your client) is bound by the post-termination non-compete. This asymmetry creates an enforceability risk.",
    location: { page: 3, paragraph: 12 },
    originalText: "Either party may terminate this Agreement upon thirty (30) days written notice. Upon termination, the Service Provider shall not compete with the Client for a period of twelve (12) months.",
    suggestion: "Make termination rights mutual or limit non-compete to mutual terminations. Add: 'The non-compete obligation shall survive only if termination is mutual or for cause by the Client.'",
    lawReference: "Section 27, Indian Contract Act, 1872 — Agreements in restraint of trade void unless reasonable",
  },
  {
    id: "a2",
    type: "one-sided",
    severity: "high",
    title: "Indemnification Favors Opposing Party",
    description: "Clause 11.1 requires your client to indemnify the opposing party for ALL claims, including those arising from the opposing party's own negligence. This is a broad indemnity that shifts all risk.",
    location: { page: 5, paragraph: 3 },
    originalText: "The Service Provider shall indemnify, defend, and hold harmless the Client from and against any and all claims, damages, losses, and expenses arising out of or related to this Agreement.",
    suggestion: "Add carve-out: 'except to the extent caused by the Client's gross negligence or willful misconduct.' Consider mutual indemnification.",
    lawReference: "Section 124, Indian Contract Act, 1872 — Contract of indemnity; Section 73 — Compensation for breach",
  },
  {
    id: "a3",
    type: "missing-protection",
    severity: "medium",
    title: "No Limitation of Liability Cap",
    description: "The agreement lacks a liability cap. Your client faces unlimited liability for any breach, including consequential damages. Industry standard is 1x annual fees or a negotiated cap.",
    location: { page: 5, paragraph: 8 },
    originalText: "",
    suggestion: "Add: 'Neither party's aggregate liability shall exceed the total fees paid by Client in the twelve (12) months preceding the claim. Neither party shall be liable for indirect, consequential, or punitive damages.'",
    lawReference: "Section 73, Indian Contract Act, 1872 — Remoteness of damage; Hadley v. Baxendale principle",
  },
  {
    id: "a4",
    type: "ambiguity",
    severity: "medium",
    title: "Vague Service Level Definitions",
    description: "Clause 4.1 references 'reasonable efforts' and 'timely delivery' without measurable metrics. Courts may interpret against the drafter (contra proferentem).",
    location: { page: 2, paragraph: 5 },
    originalText: "The Service Provider shall use reasonable efforts to deliver services in a timely manner and maintain industry-standard quality.",
    suggestion: "Replace with specific SLAs: 'Service Provider shall respond to critical issues within 4 hours, resolve within 24 hours. Uptime guarantee: 99.5% monthly.'",
    lawReference: "Contra proferentem rule — ambiguity construed against drafter",
  },
  {
    id: "a5",
    type: "risk",
    severity: "low",
    title: "Governing Law - Foreign Jurisdiction",
    description: "Clause 15.1 specifies Singapore law and courts. For an Indian client with Indian operations, this increases enforcement costs and may not be favorable.",
    location: { page: 6, paragraph: 1 },
    originalText: "This Agreement shall be governed by the laws of Singapore. Any disputes shall be resolved by the courts of Singapore.",
    suggestion: "Negotiate for Indian law (Maharashtra/Delhi) and Indian courts. At minimum, add arbitration clause with seat in India.",
    lawReference: "Section 44, Arbitration and Conciliation Act, 1996 — Foreign awards enforcement; Section 20, CPC — Jurisdiction",
  },
  {
    id: "a6",
    type: "missing-protection",
    severity: "medium",
    title: "No Force Majeure Protection for Pandemics",
    description: "Force majeure clause (Clause 12) lists traditional events but omits pandemics, epidemics, or government lockdown orders — critical post-COVID.",
    location: { page: 4, paragraph: 7 },
    originalText: "Force Majeure Events include acts of God, war, terrorism, strikes, and natural disasters.",
    suggestion: "Add: 'pandemics, epidemics, government orders, lockdowns, quarantines, and public health emergencies.'",
    lawReference: "Section 56, Indian Contract Act, 1872 — Frustration of contract; COVID-19 judicial precedents",
  },
  {
    id: "a7",
    type: "loophole",
    severity: "high",
    title: "Auto-Renewal Without Opt-Out Notice",
    description: "Clause 8.3 auto-renews for 1-year terms unless 90 days notice is given. The notice period is excessive and favors the opposing party who drafted it.",
    location: { page: 3, paragraph: 18 },
    originalText: "This Agreement shall automatically renew for successive one-year terms unless either party provides written notice of non-renewal at least ninety (90) days prior to the expiration of the then-current term.",
    suggestion: "Reduce to 30-60 days. Add: 'Non-renewal notice may be given at any time during the term.'",
    lawReference: "Consumer Protection Act, 2019 — Unfair contract terms; RBI guidelines on auto-renewal",
  },
  {
    id: "a8",
    type: "one-sided",
    severity: "medium",
    title: "IP Assignment Overreach",
    description: "Clause 9.1 assigns ALL IP created 'in connection with' the agreement to the Client, including pre-existing know-how and tools your client brings.",
    location: { page: 4, paragraph: 1 },
    originalText: "All intellectual property rights in any work product, deliverables, or inventions created in connection with this Agreement shall vest exclusively in the Client.",
    suggestion: "Carve out: 'except for Service Provider's pre-existing IP, methodologies, tools, and know-how (Background IP) which remain Service Provider's property.'",
    lawReference: "Section 17, Copyright Act, 1957 — Ownership of copyright; Patent Act, 1970 — Employer rights",
  },
];

const MOCK_OCR_RESULT: OCRResult = {
  pages: 6,
  text: `SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into as of 1st August 2026 ("Effective Date") between TechSolutions Pvt. Ltd. ("Client") and DevCorp Technologies ("Service Provider").

1. SERVICES
1.1 The Service Provider shall provide software development and maintenance services as described in Schedule A.

2. TERM
2.1 This Agreement commences on the Effective Date and continues for 12 months.

3. FEES
3.1 Client shall pay Service Provider ₹15,00,000 per annum, payable quarterly in advance.

4. SERVICE LEVELS
4.1 The Service Provider shall use reasonable efforts to deliver services in a timely manner and maintain industry-standard quality.

5. CONFIDENTIALITY
5.1 Both parties shall maintain confidentiality of proprietary information for 3 years post-termination.

6. INTELLECTUAL PROPERTY
6.1 All intellectual property rights in any work product, deliverables, or inventions created in connection with this Agreement shall vest exclusively in the Client.
6.2 Service Provider warrants that deliverables do not infringe third-party IP rights.

7. TERMINATION
7.1 Either party may terminate for material breach with 30 days cure period.
7.2 Either party may terminate this Agreement upon thirty (30) days written notice. Upon termination, the Service Provider shall not compete with the Client for a period of twelve (12) months.
7.3 This Agreement shall automatically renew for successive one-year terms unless either party provides written notice of non-renewal at least ninety (90) days prior to the expiration of the then-current term.

8. INDEMNIFICATION
8.1 The Service Provider shall indemnify, defend, and hold harmless the Client from and against any and all claims, damages, losses, and expenses arising out of or related to this Agreement.

9. LIMITATION OF LIABILITY
9.1 [INTENTIONALLY OMITTED - NO LIABILITY CAP]

10. FORCE MAJEURE
10.1 Force Majeure Events include acts of God, war, terrorism, strikes, and natural disasters.

11. GOVERNING LAW
11.1 This Agreement shall be governed by the laws of Singapore. Any disputes shall be resolved by the courts of Singapore.

12. GENERAL
12.1 This Agreement constitutes the entire understanding between the parties.

IN WITNESS WHEREOF, the parties have executed this Agreement.`,
  confidence: 94,
  scanned: true,
};

const SEVERITY_STYLES = {
  high: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200", icon: AlertTriangle, label: "High Risk" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", icon: AlertCircle, label: "Medium Risk" },
  low: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200", icon: Info, label: "Low Risk" },
};

const TYPE_LABELS = {
  loophole: "Loophole",
  "one-sided": "One-Sided",
  "missing-protection": "Missing Protection",
  ambiguity: "Ambiguity",
  risk: "Risk",
};

const TYPE_ICONS = {
  loophole: Flag,
  "one-sided": AlertTriangle,
  "missing-protection": ShieldCheck,
  ambiguity: MessageSquare,
  risk: Highlighter,
};

export default function DraftReviewPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showOcrAnimation, setShowOcrAnimation] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [filters, setFilters] = useState<Record<string, boolean>>({
    high: true,
    medium: true,
    low: true,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);

  const filteredAnomalies = useMemo(
    () => anomalies.filter(a => {
      if (!filters[a.severity]) return false;
      if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !a.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    }),
    [anomalies, filters, searchQuery]
  );

  const handleFileUpload = useCallback((file: File) => {
    setUploadedFile(file);
    setOcrResult(null);
    setAnomalies([]);
  }, []);

  const simulateOcrScan = async (file: File) => {
    setShowOcrAnimation(true);
    setScanProgress(0);
    setIsAnalyzing(true);

    // Simulate scanning animation
    const steps = [
      { progress: 10, label: "Initializing scanner..." },
      { progress: 25, label: "Detecting page boundaries..." },
      { progress: 40, label: "Running OCR engine..." },
      { progress: 60, label: "Extracting text layers..." },
      { progress: 80, label: "Analyzing layout structure..." },
      { progress: 95, label: "Finalizing extraction..." },
      { progress: 100, label: "Scan complete!" },
    ];

    for (const step of steps) {
      setScanProgress(step.progress);
      await new Promise(r => setTimeout(r, 400));
    }

    // Mock OCR result
    setOcrResult(MOCK_OCR_RESULT);
    await new Promise(r => setTimeout(r, 500));
    setShowOcrAnimation(false);

    // Run anomaly detection
    await runAnomalyDetection();
  };

  const runAnomalyDetection = async () => {
    setIsAnalyzing(true);
    // Simulate AI analysis
    await new Promise(r => setTimeout(r, 1500));
    setAnomalies(MOCK_ANOMALIES);
    setIsAnalyzing(false);
  };

  const handleAnalyze = () => {
    if (uploadedFile) {
      simulateOcrScan(uploadedFile);
    }
  };

  const downloadReport = () => {
    if (!anomalies.length) return;
    const content = `DRAFT REVIEW REPORT
Generated: ${new Date().toLocaleString("en-IN")}
File: ${uploadedFile?.name || "Unknown"}

SUMMARY
Total Anomalies: ${anomalies.length}
High Risk: ${anomalies.filter(a => a.severity === "high").length}
Medium Risk: ${anomalies.filter(a => a.severity === "medium").length}
Low Risk: ${anomalies.filter(a => a.severity === "low").length}

DETAILED FINDINGS
${anomalies.map((a, i) => `
${i + 1}. [${a.severity.toUpperCase()}] ${TYPE_LABELS[a.type]}: ${a.title}
   Location: Page ${a.location.page}, Paragraph ${a.location.paragraph}
   Issue: ${a.description}
   Original: "${a.originalText}"
   Suggestion: ${a.suggestion}
   Law Ref: ${a.lawReference || "N/A"}
`).join("\n")}`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `draft-review-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyReport = () => {
    const summary = `Draft Review: ${anomalies.length} issues found (${anomalies.filter(a => a.severity === "high").length} High, ${anomalies.filter(a => a.severity === "medium").length} Med, ${anomalies.filter(a => a.severity === "low").length} Low)`;
    navigator.clipboard.writeText(summary);
    alert("Summary copied!");
  };

  return (
    <div className="bg-navy-50/40 min-h-screen">
      {/* Header */}
      <section className="border-b border-navy-200/70 bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <span className="eyebrow text-gold-400">Advocate Portal</span>
          <h1 className="mt-2 flex items-center gap-3 font-serif text-3xl font-bold">
            <FileSearch className="h-9 w-9 text-gold-300" />
            Draft Redlining & Anomaly Detection
          </h1>
          <p className="mt-2 max-w-2xl text-navy-300">
            Upload opposing counsel's PDF to auto-detect loopholes, one-sided clauses, missing protections,
            and ambiguities. Includes OCR simulation for scanned documents.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Upload Zone */}
        {!anomalies.length && !isAnalyzing && (
          <UploadZone onUpload={handleFileUpload} uploadedFile={uploadedFile} onAnalyze={handleAnalyze} />
        )}

        {/* OCR Animation Overlay */}
        {showOcrAnimation && (
          <OcrAnimationOverlay progress={scanProgress} onCancel={() => { setShowOcrAnimation(false); setIsAnalyzing(false); }} />
        )}

        {/* Analysis Progress */}
        {isAnalyzing && !showOcrAnimation && (
          <AnalysisProgress />
        )}

        {/* Results */}
        {anomalies.length > 0 && (
          <ResultsPanel
            anomalies={filteredAnomalies}
            allAnomalies={anomalies}
            ocrResult={ocrResult}
            filters={filters}
            setFilters={setFilters}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedAnomaly={selectedAnomaly}
            setSelectedAnomaly={setSelectedAnomaly}
            onDownload={downloadReport}
            onCopy={copyReport}
            uploadedFile={uploadedFile}
            onNewUpload={() => { setUploadedFile(null); setAnomalies([]); setOcrResult(null); }}
          />
        )}

        {/* OCR Pipeline Explanation */}
        <OcrPipelineExplanation />
      </div>
    </div>
  );
}

function UploadZone({ onUpload, uploadedFile, onAnalyze }: { onUpload: (file: File) => void; uploadedFile: File | null; onAnalyze: () => void }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) onUpload(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) onUpload(e.target.files[0]);
  };

  if (uploadedFile) {
    return (
      <div className="card-surface p-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gold-100 text-gold-600">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-900">{uploadedFile.name}</h3>
              <p className="text-sm text-navy-500">{(uploadedFile.size / 1024).toFixed(1)} KB · {uploadedFile.type}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onAnalyze} className="btn-primary flex items-center gap-2">
              <FileSearch className="h-4 w-4" /> Scan & Analyze
            </button>
            <button onClick={() => onUpload(null as any)} className="btn-secondary">
              <X className="h-4 w-4" /> Remove
            </button>
          </div>
        </div>
        <div className="mt-4 p-4 bg-navy-50/50 rounded-xl">
          <p className="text-sm text-navy-600 flex items-center gap-2">
            <Info className="h-4 w-4 text-gold-500" />
            <strong>OCR Simulation:</strong> For scanned/image-based PDFs, the system will simulate a document scan
            with page-by-page text extraction (confidence scoring, layout analysis) before running anomaly detection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface p-12 text-center animate-fade-up">
      <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileSelect} className="hidden" id="file-upload" />
      <label htmlFor="file-upload" className={`cursor-pointer ${dragActive ? "ring-2 ring-gold-400 bg-gold-50/50" : ""}`}>
        <div className={`flex h-24 w-24 mx-auto items-center justify-center rounded-full border-2 border-dashed transition-all ${dragActive ? "border-gold-400 bg-gold-100" : "border-navy-200"}`}>
          <FileSearch className="h-10 w-10 text-navy-400" />
        </div>
        <h3 className="mt-4 font-semibold text-navy-900">Upload Legal Document</h3>
        <p className="mt-2 text-navy-600">Drag & drop a PDF, PNG, or JPG here, or click to browse</p>
        <p className="mt-1 text-xs text-navy-400">Max 10MB · OCR supported for scanned documents</p>
      </label>
    </div>
  );
}

function OcrAnimationOverlay({ progress, onCancel }: { progress: number; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const steps = [
    { label: "Initializing scanner...", threshold: 10 },
    { label: "Detecting page boundaries...", threshold: 25 },
    { label: "Running OCR engine...", threshold: 40 },
    { label: "Extracting text layers...", threshold: 60 },
    { label: "Analyzing layout structure...", threshold: 80 },
    { label: "Finalizing extraction...", threshold: 95 },
    { label: "Scan complete!", threshold: 100 },
  ];

  const currentStep = steps.find(s => progress < s.threshold) || steps[steps.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 animate-fade-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-navy-900 flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-gold-500" /> OCR Scan in Progress
          </h3>
          <button onClick={onCancel} className="rounded-lg p-2 text-navy-400 hover:bg-navy-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scanning Animation */}
        <div className="relative mb-6">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="w-full rounded-xl bg-navy-100"
            style={{ height: 200 }}
          >
            <source src="https://assets.mixkit.co/videos/preview/mixkit-scanning-documents-1270-large.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
            <div className="text-center text-white">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-gold-400 mb-3" />
              <p className="text-lg font-medium">{currentStep.label}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-navy-600">Overall Progress</span>
            <span className="font-semibold text-navy-900">{progress}%</span>
          </div>
          <div className="h-3 rounded-full bg-navy-100 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-gold-500 to-gold-400 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-navy-500">
            {steps.map((step, i) => (
              <div key={i} className={`flex items-center gap-1.5 ${progress >= step.threshold ? "text-emerald-600" : "text-navy-400"}`}
                style={{ opacity: progress >= step.threshold ? 1 : 0.5 }}>
                {progress >= step.threshold ? <Check className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {step.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisProgress() {
  return (
    <div className="card-surface p-6 animate-fade-up">
      <div className="flex items-center gap-3 mb-4">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
        <div>
          <h3 className="font-semibold text-navy-900">AI Anomaly Detection Running</h3>
          <p className="text-sm text-navy-500">Analyzing clauses for loopholes, one-sided terms, missing protections...</p>
        </div>
      </div>
      <div className="space-y-3">
        {["Clause segmentation", "Risk classification", "Legal reference mapping", "Redline generation"].map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-gold-500" />
            <span className="text-sm text-navy-600">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsPanel({
  anomalies,
  allAnomalies,
  ocrResult,
  filters,
  setFilters,
  searchQuery,
  setSearchQuery,
  selectedAnomaly,
  setSelectedAnomaly,
  onDownload,
  onCopy,
  uploadedFile,
  onNewUpload,
}: {
  anomalies: Anomaly[];
  allAnomalies: Anomaly[];
  ocrResult: OCRResult | null;
  filters: Record<string, boolean>;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  selectedAnomaly: Anomaly | null;
  setSelectedAnomaly: React.Dispatch<React.SetStateAction<Anomaly | null>>;
  onDownload: () => void;
  onCopy: () => void;
  uploadedFile: File | null;
  onNewUpload: () => void;
}) {
  const highCount = allAnomalies.filter(a => a.severity === "high").length;
  const medCount = allAnomalies.filter(a => a.severity === "medium").length;
  const lowCount = allAnomalies.filter(a => a.severity === "low").length;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-navy-900">Analysis Complete</h2>
          <p className="text-sm text-navy-500">
            {anomalies.length} of {allAnomalies.length} anomalies shown · {uploadedFile?.name}
            {ocrResult && <span className="ml-2 inline-flex items-center gap-1 text-gold-600"><FileText className="h-3.5 w-3.5" /> OCR: {ocrResult.confidence}% confidence</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onNewUpload} className="btn-secondary">New Document</button>
          <button onClick={onCopy} className="btn-secondary"><Copy className="h-4 w-4" /> Copy Summary</button>
          <button onClick={onDownload} className="btn-primary"><Download className="h-4 w-4" /> Download Report</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Issues" value={allAnomalies.length} icon={Flag} color="navy" />
        <StatCard label="High Risk" value={highCount} icon={AlertTriangle} color="red" />
        <StatCard label="Medium Risk" value={medCount} icon={AlertCircle} color="amber" />
        <StatCard label="Low Risk" value={lowCount} icon={Info} color="blue" />
      </div>

      {/* Filters & Search */}
      <div className="card-surface p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search anomalies by title, description..."
            className="input pl-10 w-full"
          />
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {(["high", "medium", "low"] as const).map(sev => {
            const Icon = SEVERITY_STYLES[sev].icon;
            return (
              <label key={sev} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters[sev]}
                  onChange={e => setFilters(prev => ({ ...prev, [sev]: e.target.checked }))}
                  className="h-4 w-4 rounded border-navy-300 focus:ring-gold-500"
                />
                <span className={`text-sm font-medium ${SEVERITY_STYLES[sev].text}`}>
                  <Icon className="h-3.5 w-3.5 inline" /> {SEVERITY_STYLES[sev].label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Anomaly List */}
      <div className="card-surface overflow-hidden">
        {anomalies.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="mx-auto h-12 w-12 text-navy-300 mb-4" />
            <p className="text-navy-600">No anomalies match your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-navy-100">
            {anomalies.map(anomaly => (
              <AnomalyRow
                key={anomaly.id}
                anomaly={anomaly}
                isSelected={selectedAnomaly?.id === anomaly.id}
                onClick={() => setSelectedAnomaly(selectedAnomaly?.id === anomaly.id ? null : anomaly)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedAnomaly && (
        <AnomalyDetailPanel anomaly={selectedAnomaly} onClose={() => setSelectedAnomaly(null)} />
      )}
    </div>
  );
}

function AnomalyRow({ anomaly, isSelected, onClick }: { anomaly: Anomaly; isSelected: boolean; onClick: () => void }) {
  const style = SEVERITY_STYLES[anomaly.severity];
  const TypeIcon = TYPE_ICONS[anomaly.type];

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left transition-all ${isSelected ? "bg-gold-50 border-l-4 border-gold-500" : "hover:bg-navy-50/50"}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg ${style.bg}`}>
          <TypeIcon className="h-5 w-5" style={{ color: style.text.replace("text-", "") }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-navy-900 truncate">{anomaly.title}</h4>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${style.bg} ${style.text} ${style.ring}`}>
              {style.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-navy-600 truncate">{anomaly.description}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-navy-400">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" /> Page {anomaly.location.page} · ¶{anomaly.location.paragraph}
            </span>
            <span className="flex items-center gap-1">
              <TypeIcon className="h-3 w-3" /> {TYPE_LABELS[anomaly.type]}
            </span>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-navy-400 transition-transform ${isSelected ? "rotate-180" : ""}`} />
      </div>
    </button>
  );
}

function AnomalyDetailPanel({ anomaly, onClose }: { anomaly: Anomaly; onClose: () => void }) {
  const style = SEVERITY_STYLES[anomaly.severity];
  const TypeIcon = TYPE_ICONS[anomaly.type];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 sm:p-0">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between border-b border-navy-200 bg-navy-900 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5" style={{ color: style.text.replace("text-", "") }} />
            <span className="font-semibold">{anomaly.title}</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Severity Badge */}
          <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${style.bg} ${style.text} ${style.ring}`}>
            <TypeIcon className="h-4 w-4" />
            {TYPE_LABELS[anomaly.type]} · {style.label}
          </div>

          {/* Location */}
          <div className="flex items-center gap-4 text-sm text-navy-600">
            <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Page {anomaly.location.page}</span>
            <span className="flex items-center gap-1"><Type className="h-3.5 w-3.5" /> Paragraph {anomaly.location.paragraph}</span>
          </div>

          {/* Original Text */}
          {anomaly.originalText && (
            <div>
              <h4 className="font-semibold text-navy-900 mb-2 flex items-center gap-2">
                <Eye className="h-4 w-4 text-gold-500" /> Original Clause
              </h4>
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-800 font-mono whitespace-pre-wrap">{anomaly.originalText}</p>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="font-semibold text-navy-900 mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-gold-500" /> Issue Analysis
            </h4>
            <p className="text-navy-700 leading-relaxed">{anomaly.description}</p>
          </div>

          {/* Suggestion */}
          <div>
            <h4 className="font-semibold text-navy-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Recommended Fix
            </h4>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-sm text-emerald-800">{anomaly.suggestion}</p>
            </div>
          </div>

          {/* Law Reference */}
          {anomaly.lawReference && (
            <div className="flex items-start gap-3 p-4 bg-navy-50 border border-navy-200 rounded-xl">
              <BookOpen className="mt-0.5 h-5 w-5 text-gold-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-navy-900">Legal Reference</p>
                <p className="text-sm text-navy-700 mt-1">{anomaly.lawReference}</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-navy-200 px-4 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="btn-primary">Close</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const colorMap = {
    navy: "bg-navy-100 text-navy-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <div className="card-surface p-4">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[color as keyof typeof colorMap]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-2xl font-bold text-navy-900">{value}</span>
      </div>
      <p className="mt-2 text-sm text-navy-500">{label}</p>
    </div>
  );
}

function OcrPipelineExplanation() {
  const steps = [
    { number: 1, title: "Document Input", desc: "PDF/PNG/JPG uploaded — detects if scanned (image-based) or native (text-based)" },
    { number: 2, title: "Preprocessing", desc: "Deskewing, denoising, binarization, page segmentation for optimal OCR accuracy" },
    { number: 3, title: "OCR Engine", desc: "Tesseract/PaddleOCR runs — character recognition with confidence scoring per word" },
    { number: 4, title: "Layout Analysis", desc: "Paragraphs, tables, headers, footers detected — reading order reconstructed" },
    { number: 5, title: "Text Extraction", desc: "Full text output with position metadata (page, paragraph, coordinates)" },
    { number: 6, title: "Clause Segmentation", desc: "Legal NLP splits document into logical clauses with clause-type classification" },
    { number: 7, title: "Risk Analysis", desc: "Pattern matching + ML model flags loopholes, one-sided terms, missing protections" },
    { number: 8, title: "Legal Mapping", desc: "Each anomaly mapped to relevant statutes (ICA, CPC, Arbitration Act, etc.)" },
    { number: 9, title: "Redline Report", desc: "Interactive report with original text, risk level, suggested fix, and law reference" },
  ];

  return (
    <div className="mt-12">
      <h2 className="font-serif text-xl font-semibold text-navy-900 mb-6 flex items-center gap-2">
        <Info className="h-5 w-5 text-gold-500" /> OCR & Anomaly Detection Pipeline (Production Architecture)
      </h2>
      <div className="card-surface p-6">
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-gold-500 text-navy-950 font-bold text-sm">
                {step.number}
              </div>
              <div className="flex-1 pt-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-navy-900">{step.title}</h4>
                  {step.number === 3 && <span className="rounded-full bg-gold-100 px-1.5 py-0.5 text-xs font-medium text-gold-700">Simulation Active</span>}
                </div>
                <p className="text-sm text-navy-600">{step.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-shrink-0 w-0.5 h-full bg-navy-200 ml-4" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 bg-navy-50/50 rounded-xl">
          <p className="text-sm text-navy-600 flex items-center gap-2">
            <Info className="h-4 w-4 text-gold-500" />
            <strong>Current Demo:</strong> OCR simulation with mock anomalies. Production would integrate Tesseract.js (client-side)
            or cloud OCR (AWS Textract, Google Document AI) + legal NLP model for automated clause-level analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
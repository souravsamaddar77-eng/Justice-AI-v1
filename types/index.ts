// ─────────────────────────────────────────────────────────────
//  Shared types for the Justice AI app (client ⇄ server contract)
// ─────────────────────────────────────────────────────────────

/** Tag identifying which backend produced a response. */
export type Source = "gemini" | "groq" | "nemotron" | "mock";
export type ResponseLanguage = "en" | "hi" | "bn" | "ta" | "te" | "mr" | "gu" | "kn" | "ml" | "pa";
export interface AIRequestOptions {
  language?: ResponseLanguage;
  stream?: boolean;
}
export interface AIMetadata {
  provider: "gemini" | "groq" | "nemotron"; model: string; fallback: boolean; attempts: number;
  firstResponseMs: number; totalMs: number;
}

/* ─────────── Web Speech API types ─────────── */

export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

/* ─────────── Chat (Gemini) ─────────── */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequestBody extends AIRequestOptions {
  message: string;
  // Earlier turns, most-recent-last. Lets the model keep context.
  history?: ChatMessage[];
  /** Persona switch — keeps the same route flexible for citizen vs advocate. */
  persona?: "citizen" | "advocate";
}

export interface ChatResponseBody {
  reply: string;
  source: Source;
  metadata?: AIMetadata;
}

/* ─────────── Document analysis (Gemini) ─────────── */

export type Urgency = "High" | "Medium" | "Low";

export interface AnalyzeRequestBody extends AIRequestOptions {
  /** Text extracted from the uploaded notice. May be empty when fileBase64 is supplied. */
  text: string;
  /** Original filename used to validate and extract an uploaded file. */
  filename?: string;
  fileBase64?: string;
  redact?: boolean;
}

export interface AnalyzeResponseBody {
  urgency: Urgency;
  /** Days remaining to respond, derived from statutory deadlines. */
  daysToRespond: number | null;
  /** Human-readable date string (ISO short form). Absolute date computed server-side. */
  deadlineDate: string | null;
  deadlineStatus?: "unconfirmed" | "unknown";
  deadlineSource?: string | null;
  extractionMethod?: "none" | "native" | "ocr" | "mixed";
  metadata?: AIMetadata;
  summary: string[];
  /** Key legal terms detected in the notice. */
  keyTerms: string[];
  source: Source;
}

/* ─────────── Drafting co-pilot ─────────── */

export type DocumentType =
  | "bail_application"
  | "reply_to_notice"
  | "affidavit"
  | "legal_notice_draft";

export interface DraftRequestBody extends AIRequestOptions {
  clientName: string;
  issue: string;
  date: string;
  documentType: DocumentType;
  /** Free-text extra context the advocate may add. */
  additionalNotes?: string;
}

export interface DraftResponseBody {
  title: string;
  document: string;
  source: Source;
  metadata?: AIMetadata;
}

/* ─────────── IPC ↔ BNS converter (local dataset) ─────────── */

export interface CodeMapping {
  /** Indian Penal Code, 1860 section number (string keeps "420A" valid). */
  ipcSection: string;
  ipcTitle: string;
  /** Bharatiya Nyaya Sanhita, 2023 section number. */
  bnsSection: string;
  bnsTitle: string;
  /** Short plain-language description of the offence. */
  description: string;
  category: string;
}

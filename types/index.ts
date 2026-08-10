// ─────────────────────────────────────────────────────────────
//  Shared types for the Justice AI app (client ⇄ server contract)
// ─────────────────────────────────────────────────────────────

/** Tag identifying which backend produced a response. */
export type Source = "gemini" | "nemotron" | "mock";

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

export interface ChatRequestBody {
  message: string;
  // Earlier turns, most-recent-last. Lets the model keep context.
  history?: ChatMessage[];
  /** Persona switch — keeps the same route flexible for citizen vs advocate. */
  persona?: "citizen" | "advocate";
}

export interface ChatResponseBody {
  reply: string;
  source: Source;
}

/* ─────────── Document analysis (Gemini) ─────────── */

export type Urgency = "High" | "Medium" | "Low";

export interface AnalyzeRequestBody {
  /** Text extracted from the uploaded notice. May be empty for a UI-only demo. */
  text: string;
  /** Original filename, used as a fallback signal for mock mode. */
  filename?: string;
}

export interface AnalyzeResponseBody {
  urgency: Urgency;
  /** Days remaining to respond, derived from statutory deadlines. */
  daysToRespond: number;
  /** Human-readable date string (ISO short form). Absolute date computed server-side. */
  deadlineDate: string;
  summary: string[];
  /** Key legal terms detected in the notice. */
  keyTerms: string[];
  source: Source;
}

/* ─────────── Drafting co-pilot (Nemotron) ─────────── */

export type DocumentType =
  | "bail_application"
  | "reply_to_notice"
  | "affidavit"
  | "legal_notice_draft";

export interface DraftRequestBody {
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

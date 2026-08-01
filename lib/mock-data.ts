// ─────────────────────────────────────────────────────────────
//  Realistic mock responses for the Justice AI demo.
//
//  Used as a fallback by every API route when an API key is missing
//  or a provider call fails. This keeps the on-stage demo unbreakable.
//  Check the "source" field on responses to see which path served you.
// ─────────────────────────────────────────────────────────────

import type { Urgency } from "@/types";

/* ─── Keyword helpers — used to make mock output feel responsive ─── */

/** Detect urgency-related keywords in input text. */
export function inferUrgency(text: string): Urgency {
  const t = text.toLowerCase();
  const high = ["urgent", "immediate", "final notice", "court", "summons", "warrant", "eviction", "7 days", "24 hours", "arrest"];
  const medium = ["notice", "reply", "respond", "default", "due", "payment", "hearing", "15 days", "30 days"];
  if (text.trim().length === 0) return "Medium";
  if (high.some((k) => t.includes(k))) return "High";
  if (medium.some((k) => t.includes(k))) return "Medium";
  return "Low";
}

/**
 * Estimate days remaining to respond based on detected keywords.
 * Pure heuristic — clearly labeled as a prototype estimate.
 */
export function inferDaysToRespond(text: string, filename = ""): number {
  const t = `${text} ${filename}`.toLowerCase();
  const match =
    t.match(/(\d{1,2})\s*days?/) ||
    t.match(/within\s*(\d{1,2})/) ||
    (t.includes("24 hours") ? ["24 hours", "1"] : null);
  if (match && match[1]) {
    const n = parseInt(match[1], 10);
    if (n > 0 && n <= 60) return n;
  }
  // Sensible default for a notice: 15 days.
  if (t.includes("summons") || t.includes("court") || t.includes("high court") || t.includes("supreme")) return 15;
  if (t.includes("income tax") || t.includes("gst") || t.includes("tax")) return 21;
  if (t.includes("cheque bounce") || t.includes("138") || t.includes("negotiable instruments")) return 15;
  return 15;
}

/* ─── Chat replies (Gemini fallback) ─── */

const CITIZEN_CHAT_REPLIES = [
  "Based on the notice you described, you generally should not ignore it. Ignoring a legal notice can lead to ex-parte proceedings — meaning the court may decide against you without hearing your side. I recommend consulting a practising advocate within the response window mentioned in the notice.",
  "Here's the simple version: this notice appears to be a demand for reply or payment. The deadline shown is statutory — missing it can trigger penalties or presumption against you. The safest first step is to draft a point-wise reply through a lawyer before the deadline expires.",
  "In India, if a legal notice is ignored, the other party can approach the court and seek a default decree. For notices under the Negotiable Instruments Act (cheque bounce), you typically get 15 days to pay before a complaint is filed. Please confirm the exact statute quoted in your notice for tailored guidance.",
  "That's a common concern. The 'urgency' rating I show is a heuristic for this prototype and not legal advice. If the notice warns of criminal action or eviction, treat it as High urgency and seek immediate legal counsel. Civil or tax notices usually allow more time but still should be answered in writing.",
];

const ADVOCATE_CHAT_REPLIES = [
  "For a Section 138 (Negotiable Instruments Act) defence, focus on: (1) whether the notice validly demanded the cheque amount within 15 days, (2) whether the drawer was issued a legal demand notice, and (3) the drawer's real ability to pay. Want me to draft a reply skeleton?",
  "Under BNS 2023, the old IPC 420 (cheating) maps to BNS Section 318. The mens rea requirement remains — I'd frame the defence around absence of fraudulent or dishonest intention at the inception of the transaction.",
  "For the bail application, I'd raise: (i) the allegation is circumstantial, (ii) no criminal antecedents, (iii) investigation is complete and the accused isn't needed for custody, (iv) willingness to furnish sureties. Share the FIR particulars and I'll draft point-wise grounds.",
];

export function mockChatReply(message: string, persona: "citizen" | "advocate" = "citizen"): string {
  const pool = persona === "advocate" ? ADVOCATE_CHAT_REPLIES : CITIZEN_CHAT_REPLIES;
  const m = message.toLowerCase();
  // Keyword-sticky answers for a more convincing live demo.
  if (persona === "citizen" && (m.includes("ignore") || m.includes("what happens"))) return CITIZEN_CHAT_REPLIES[0];
  if (persona === "citizen" && m.includes("deadline")) return CITIZEN_CHAT_REPLIES[1];
  if (persona === "citizen" && (m.includes("cheque") || m.includes("138"))) return CITIZEN_CHAT_REPLIES[2];
  if (persona === "advocate" && (m.includes("138") || m.includes("cheque"))) return ADVOCATE_CHAT_REPLIES[0];
  if (persona === "advocate" && (m.includes("420") || m.includes("bns"))) return ADVOCATE_CHAT_REPLIES[1];
  if (persona === "advocate" && (m.includes("bail"))) return ADVOCATE_CHAT_REPLIES[2];
  // Deterministic pick so replays look stable.
  const idx = m.length % pool.length;
  return pool[idx];
}

/* ─── Document analysis (Gemini fallback) ─── */

const SAMPLE_KEY_TERMS = ["Legal Notice", "Demand", "Reply Window", "Cause of Action", "Statutory Compliance"];

export function mockAnalyze(text: string, filename = "") {
  const urgency = inferUrgency(`${text} ${filename}`);
  const days = inferDaysToRespond(text, filename);

  const notices = [
    "This is a formal legal demand requiring your written response within the stated period.",
    "The notice alleges a default (payment/obligation) and reserves the other party's right to approach a court if you do not comply.",
    "You should not ignore it — respond in writing through an advocate before the deadline to preserve your rights and avoid ex-parte action.",
  ];

  const baseTerms = SAMPLE_KEY_TERMS;
  const detected: string[] = [];
  const t = `${text} ${filename}`.toLowerCase();
  if (t.includes("cheque")) detected.push("Section 138 Negotiable Instruments Act");
  if (t.includes("138")) detected.push("Section 138 Negotiable Instruments Act");
  if (t.includes("eviction") || t.includes("rent")) detected.push("Eviction / Rent Control");
  if (t.includes("income tax") || t.includes("itr")) detected.push("Income Tax demand");
  if (t.includes("gst")) detected.push("GST demand");
  if (t.includes("defamation")) detected.push("Defamation (IPC 499/500 → BNS 356)");
  if (detected.length === 0) detected.push(...baseTerms.slice(0, 3));

  return {
    urgency,
    daysToRespond: days,
    deadlineDate: isoShort(days),
    summary: notices,
    keyTerms: detected,
  };
}

/* ─── Legal drafting (Nemotron fallback) ─── */

const DOC_TITLES: Record<string, string> = {
  bail_application: "Bail Application under Section 439 Cr.P.C.",
  reply_to_notice: "Reply to Legal Notice",
  affidavit: "Affidavit",
  legal_notice_draft: "Legal Notice",
};

export function mockDraft(opts: { clientName: string; issue: string; date: string; documentType: string; additionalNotes?: string }) {
  const client = opts.clientName || "Mr./Ms. _____";
  const issue = opts.issue || "[Describe the grievance here]";
  const date = opts.date || "[Date]";
  const notes = opts.additionalNotes?.trim() || "";
  const title = DOC_TITLES[opts.documentType] || "Legal Document";

  const body = renderDocument(opts.documentType, client, issue, date, notes);
  return { title, document: body };
}

function renderDocument(type: string, client: string, issue: string, date: string, notes: string): string {
  const intro = `BEFORE THE HON'BLE COURT AT [JURISDICTION]`;
  switch (type) {
    case "bail_application":
      return [
        intro,
        "",
        "APPLICATION FOR BAIL UNDER SECTION 439 OF THE CODE OF CRIMINAL PROCEDURE, 1973",
        "",
        "MOST RESPECTFULLY SHOWETH:",
        "",
        "1. The applicant is a law-abiding citizen and is seeking regular/anticipatory bail in connection with the case arising out of the allegations set out below.",
        `2. The applicant's name is ${client}. The matter relates to: ${issue}.`,
        "3. The applicant has no prior criminal antecedents and has deep roots in society.",
        "4. Investigation, if any, is complete and no recovery is required from the applicant.",
        "5. The applicant undertakes to appear before this Hon'ble Court as and when required and to abide by all conditions.",
        notes ? `6. Additional submissions: ${notes}` : "",
        "",
        "PRAYER:",
        "Wherefore it is most respectfully prayed that this Hon'ble Court be pleased to grant bail to the applicant on such terms as it deems fit and proper in the interest of justice. Any other relief in the interest of equity and justice may also be granted.",
        "",
        `Date: ${date}`,
        "                                  ____________________",
        `                                  ${client} (through advocate)`,
      ].filter(Boolean).join("\n");

    case "reply_to_notice":
      return [
        `RESPONSE TO LEGAL NOTICE DATED ${date}`,
        "",
        "To",
        "[Sender of the Notice]",
        "",
        "Sub: Reply to your legal notice",
        "",
        "Sir/Madam,",
        "",
        `${intro.replace("BEFORE THE HON'BLE COURT AT", "With reference to").trim()}. I hereby respond to your notice as follows:`,
        "",
        `1. The allegations/claims made in your notice concerning "${issue}" are denied to the extent they are contrary to facts.`,
        "2. There is no legally enforceable liability as alleged, and the assertions in your notice are misconceived.",
        "3. You are put to strict proof of the averments made in your notice.",
        "4. I reserve my right to take appropriate legal proceedings against any coercive or unfounded steps you may initiate.",
        notes ? `5. Further: ${notes}` : "",
        "",
        "A copy of this reply is retained for record.",
        "",
        `Date: ${date}`,
        `                                    ${client}`,
        "                                    (through advocate)",
      ].filter(Boolean).join("\n");

    case "affidavit":
      return [
        "AFFIDAVIT",
        "",
        `I, ${client}, do hereby solemnly affirm and declare as under:`,
        "",
        `1. That I am the deponent in the present matter and am competent to swear this affidavit.`,
        `2. That the subject matter relates to: ${issue}.`,
        "3. That the statements made herein are true and correct to the best of my knowledge and belief.",
        "4. That nothing material has been concealed therefrom.",
        notes ? `5. That ${notes}.` : "",
        "",
        `Verified at [Place] on this ${date}, the contents of which are true and correct to the best of my knowledge and belief.`,
        "",
        "                                  DEPONENT",
      ].filter(Boolean).join("\n");

    case "legal_notice_draft":
    default:
      return [
        "LEGAL NOTICE",
        "",
        `Dated: ${date}`,
        "",
        "To,",
        "[Respondent Name]",
        "[Address]",
        "",
        "Sub: Legal notice",
        "",
        "Sir/Madam,",
        "",
        "Under my instructions from my client, I hereby serve upon you the following notice:",
        "",
        `1. That my client ${client} has a grievance regarding ${issue}.`,
        "2. That your conduct as described is unlawful and has caused loss and injury to my client.",
        "3. That you are hereby called upon to remedy the same within 15 days of receipt of this notice, failing which appropriate proceedings shall be initiated against you at your risk as to cost and consequences.",
        notes ? `4. That ${notes}.` : "",
        "",
        "A copy of this notice is retained for record and further necessary action.",
        "",
        "Advocate",
      ].filter(Boolean).join("\n");
  }
}

/* ─── date helper (server-safe, no Date.now in module scope) ─── */

/** Return an ISO short date string (yyyy-mm-dd) N days from today. */
export function isoShort(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

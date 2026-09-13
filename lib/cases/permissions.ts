import type { CaseInvitation, CaseItem, CasePermission, CaseRecord } from "@/types/cases";

const rank: Record<CasePermission, number> = { read: 1, comment: 2, edit: 3, owner: 4 };
export function acceptedGrants(grants: CaseInvitation[], userId: string): CaseInvitation[] {
  return grants.filter(g => g.status === "accepted" && g.accepted_by === userId);
}
export function casePermission(record: CaseRecord, grants: CaseInvitation[], userId: string): CasePermission | null {
  if (record.owner_id === userId) return "owner";
  return acceptedGrants(grants, userId).reduce<CasePermission | null>((best, g) =>
    !best || rank[g.permission] > rank[best] ? g.permission : best, null);
}
export function itemPermission(record: CaseRecord, grants: CaseInvitation[], userId: string, item: CaseItem): CasePermission | null {
  if (item.case_id !== record.id || item.deleted_at) return null;
  if (record.owner_id === userId) return "owner";
  const active = acceptedGrants(grants, userId);
  return active.filter(g => g.item_ids.includes(item.id) || item.created_by === userId)
    .reduce<CasePermission | null>((best, g) => !best || rank[g.permission] > rank[best] ? g.permission : best, null);
}
export function permits(permission: CasePermission | null, required: "read" | "comment" | "edit" | "owner"): boolean {
  return permission !== null && rank[permission] >= rank[required];
}

export function validateSource(source: CaseItem | undefined, metadata: Record<string, unknown>): boolean {
  if (!source || source.kind !== "document" || source.deleted_at) return false;
  const excerpt = metadata.source_excerpt;
  const extracted = source.metadata.extracted_text;
  if (typeof excerpt !== "string" || !excerpt.trim() || typeof extracted !== "string") return false;
  return extracted.includes(excerpt);
}

export function proposeTimeline(text: string): { title: string; content: string; metadata: Record<string, unknown> }[] {
  const results: { title: string; content: string; metadata: Record<string, unknown> }[] = [];
  // Deliberately only explicit calendar dates. Relative deadlines are never calculated.
  const pattern = /\b(\d{4})-(\d{2})-(\d{2})\b|\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})\b/g;
  for (const match of text.matchAll(pattern)) {
    if (results.length >= 30) break;
    const year = match[1] || match[6], month = match[2] || match[5], day = match[3] || match[4];
    const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) continue;
    const at = match.index || 0;
    const excerpt = text.slice(Math.max(0, at - 100), Math.min(text.length, at + match[0].length + 200));
    results.push({ title: `Date mentioned: ${date}`, content: excerpt, metadata: {
      date, date_type: "explicit", confirmation: "pending_review", source_excerpt: excerpt,
      assumptions: match[4] ? "Numeric dates interpreted as day/month/year. Confirm against the original." : "Calendar date copied from source; its legal significance requires review.",
    }});
  }
  return results;
}

export function proposeSourceFacts(text: string): { kind: "timeline" | "task"; title: string; content: string; metadata: Record<string, unknown> }[] {
  const facts: { kind: "timeline" | "task"; title: string; content: string; metadata: Record<string, unknown> }[] = proposeTimeline(text).map(p => ({ kind: "timeline", ...p }));
  const partyPattern = /^(?:from|to|petitioner|respondent|plaintiff|defendant|complainant|applicant|accused)\s*[:\-]\s*([^\r\n]{2,160})/gim;
  for (const match of text.matchAll(partyPattern)) {
    if (facts.length >= 40) break;
    facts.push({ kind: "timeline", title: "Party named in source", content: match[0], metadata: {
      date: null, date_type: "unknown", confirmation: "pending_review", parties: [match[1].trim()],
      source_excerpt: match[0], assumptions: "Party label copied from the document; identity and role require review.",
    }});
  }
  const sentences = text.match(/[^\n.!?]{8,500}(?:[.!?]|$)/g) || [];
  for (const sentence of sentences) {
    if (facts.length >= 50) break;
    if (!/\b(must|shall|required to|requested to|directed to)\s+(?:\w+\s+){0,4}(submit|file|appear|respond|pay|provide|attend|produce|reply)\b/i.test(sentence)) continue;
    const excerpt = sentence.trim();
    facts.push({ kind: "task", title: `Review action: ${excerpt.slice(0, 120)}`, content: excerpt, metadata: {
      completed: false, due_date: null, confirmation: "pending_review", source_excerpt: excerpt,
      assumptions: "Possible action copied from source wording. No due date or legal obligation has been independently verified.",
    }});
  }
  return facts;
}

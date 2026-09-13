import { AIError } from "./providers";
import type { AnalyzeResponseBody, Urgency } from "../types";
function excerptContainsDate(excerpt: string, iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (excerpt.includes(iso)) return true;
  if (new RegExp(`\\b0?${day}[./-]0?${month}[./-]${year}\\b`).test(excerpt)) return true;
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const name = names[month - 1];
  return new RegExp(`\\b(?:0?${day}(?:st|nd|rd|th)?\\s+${name}(?:,)?\\s+${year}|${name}\\s+0?${day}(?:st|nd|rd|th)?(?:,)?\\s+${year})\\b`, "i").test(excerpt);
}
export function parseAnalysis(raw: string, sourceText: string): Omit<AnalyzeResponseBody, "source"> {
  let value: Record<string, unknown>;
  try { value = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, "")); } catch { throw new AIError("malformed", "Provider analysis was not valid JSON. Please retry.", true, 502); }
  if (!value || !["High", "Medium", "Low"].includes(String(value.urgency)) || !Array.isArray(value.summary) || value.summary.length !== 3 || value.summary.some(s => typeof s !== "string" || !s.trim() || s.length > 2000) || !Array.isArray(value.keyTerms) || value.keyTerms.length > 5 || value.keyTerms.some(s => typeof s !== "string" || s.length > 200)) throw new AIError("malformed", "Provider analysis did not match the required structure. Please retry.", true, 502);
  const date = typeof value.deadlineDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.deadlineDate) && !Number.isNaN(Date.parse(value.deadlineDate)) && new Date(value.deadlineDate).toISOString().slice(0, 10) === value.deadlineDate ? value.deadlineDate : null;
  const excerpt = typeof value.deadlineSource === "string" && value.deadlineSource.trim() && sourceText.includes(value.deadlineSource) ? value.deadlineSource : null;
  const deadlineDate = date && excerpt && excerptContainsDate(excerpt, date) ? date : null;
  return { urgency: value.urgency as Urgency, summary: value.summary as string[], keyTerms: value.keyTerms as string[], deadlineDate, daysToRespond: deadlineDate ? Math.ceil((Date.parse(deadlineDate) - Date.parse(new Date().toISOString().slice(0, 10))) / 86400000) : null, deadlineStatus: deadlineDate ? "unconfirmed" : "unknown", deadlineSource: deadlineDate ? excerpt : null };
}

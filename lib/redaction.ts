/** Pattern masking only; cannot promise removal of every identifying detail. */
export function redactIdentifiers(text: string) {
  return text.replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, "[AADHAAR REDACTED]")
    .replace(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/gi, "[PAN REDACTED]")
    .replace(/(?:\+91[ -]?)?\b[6-9]\d{9}\b/g, "[PHONE REDACTED]");
}

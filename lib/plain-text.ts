/** Turn AI Markdown into readable text without interpreting it as HTML. */
export function toPlainText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/^[ \t]*```[^\n]*\n?/gm, "")
    .replace(/^[ \t]*~~~[^\n]*\n?/gm, "")
    .replace(/^ {0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/gm, "$1")
    .replace(/^ {0,3}>[ \t]?/gm, "")
    .replace(/^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, "")
    .replace(/^([ \t]*)[-*+]\s+(?:\[[ xX]\]\s+)?/gm, "$1• ")
    .replace(/!?\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, (_, label: string, url: string) => label === url ? url : `${label} (${url})`)
    .replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/g, "$1")
    .replace(/(^|[^\p{L}\p{N}_])(\*\*|__|~~)(?=\S)([\s\S]*?\S)\2(?=$|[^\p{L}\p{N}_])/gu, "$1$3")
    .replace(/(^|[\s([{])([*_])(?=\S)([^\n]*?\S)\2(?=$|[\s.,!?;:)\]}])/g, "$1$3")
    .replace(/`([^`\n]+)`/g, "$1")
    // A stream can stop in the middle of emphasis. Preserve arithmetic operators.
    .replace(/(^|[\s([{])\*{2,}(?=\p{L})/gu, "$1")
    .replace(/(?<=\p{L})\*{2,}(?=$|[\s.,!?;:)\]}])/gu, "")
    .replace(/\\([*_`#[\]()>])/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

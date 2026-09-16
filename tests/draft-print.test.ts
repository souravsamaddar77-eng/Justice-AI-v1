import assert from "node:assert/strict";
import test from "node:test";
import { draftPrintHtml } from "../lib/draft-print";
import type { Language } from "../lib/i18n";

const drafts: Record<Language, string> = {
  en: "Reply to notice\nAmount: ₹2,00,000",
  hi: "कानूनी नोटिस का उत्तर\nप्रार्थी: रमेश कुमार",
  bn: "আইনি নোটিশের উত্তর\nআবেদনকারী: রমেশ কুমার",
  ta: "சட்ட அறிவிப்புக்கான பதில்\nவிண்ணப்பதாரர்: ரமேஷ் குமார்",
  te: "న్యాయ నోటీసుకు సమాధానం\nదరఖాస్తుదారు: రమేష్ కుమార్",
  mr: "कायदेशीर नोटिशीचे उत्तर\nअर्जदार: रमेश कुमार",
  gu: "કાનૂની નોટિસનો જવાબ\nઅરજદાર: રમેશ કુમાર",
  kn: "ಕಾನೂನು ನೋಟಿಸ್‌ಗೆ ಉತ್ತರ\nಅರ್ಜಿದಾರ: ರಮೇಶ್ ಕುಮಾರ್",
  ml: "നിയമ നോട്ടീസിനുള്ള മറുപടി\nഅപേക്ഷകൻ: രമേഷ് കുമാർ",
  pa: "ਕਾਨੂੰਨੀ ਨੋਟਿਸ ਦਾ ਜਵਾਬ\nਬਿਨੈਕਾਰ: ਰਮੇਸ਼ ਕੁਮਾਰ",
};

test("printable draft preserves Unicode and paragraph breaks for all ten UI languages", () => {
  for (const [language, document] of Object.entries(drafts)) {
    const title = document.split("\n")[0];
    const html = draftPrintHtml({ title, document, language: language as Language }, "http://localhost:3000");
    assert.ok(html.includes(`<html lang="${language}">`));
    assert.ok(html.includes(`<h1>${title}</h1>`));
    assert.ok(html.includes(`<div class="draft-body">${document}</div>`));
    assert.match(html, /charset="utf-8"/);
    assert.match(html, /UNREVIEWED AI DRAFT/);
    assert.match(html, /white-space: pre-wrap/);
    assert.match(html, /Nirmala UI/);
    assert.match(html, /http:\/\/localhost:3000\/fonts\/NotoSansDevanagari-Regular.ttf/);
  }
});

test("draft titles and contents cannot inject HTML, JavaScript or print-view navigation", () => {
  const html = draftPrintHtml({ title: '</title><script>alert("title")</script>', document: '<img src=x onerror="alert(1)">\n<script>window.opener.location="https://evil.example"</script> & proof', language: "en" }, "https://justice.example");
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"));
  assert.ok(html.includes("&amp; proof"));
  assert.match(html, /default-src 'none'/);
  assert.throws(() => draftPrintHtml({ title: "Draft", document: "Text", language: "en" }, "javascript:alert(1)"));
});

test("print-only controls stay outside the saved PDF and simulated drafts remain marked", () => {
  const html = draftPrintHtml({ title: "Sample", document: "Sample body", language: "en", simulated: true }, "https://justice.example");
  assert.match(html, /@media print[^]*\.print-actions \{display: none;\}/);
  assert.match(html, /DEMO SAMPLE — SIMULATED \/ NOT REVIEWED/);
  assert.match(html, /@page \{size: A4;/);
});

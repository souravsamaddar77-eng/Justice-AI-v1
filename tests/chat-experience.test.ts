import assert from "node:assert/strict";
import test from "node:test";
import { toPlainText } from "../lib/plain-text";
import { VoiceReplyGate } from "../lib/chat-voice";
import { CHAT_COPY_KEY_COUNT, CHAT_COPY_ROWS, FAQ_IDS, FAQ_ROWS, chatCopy, chatSuggestions } from "../lib/chat-copy";
import type { Language } from "../lib/i18n";

test("AI formatting removes emphasis, headings and fences without losing Indic text or section references", () => {
  assert.equal(toPlainText("## Your next steps\n\n**नोटिस** पढ़ें।\n* தமிழ் பதில்\n- **Section 138**\n\n```text\nKeep the original.\n```"), "Your next steps\n\nनोटिस पढ़ें।\n• தமிழ் பதில்\n• Section 138\n\nKeep the original.");
  assert.equal(toPlainText("Read *carefully*, _today_, and ~~later~~. `case_id` stays."), "Read carefully, today, and later. case_id stays.");
});

test("plain text preserves mathematics, filenames, links and angle-bracket text without executing HTML", () => {
  assert.equal(toPlainText("2 * 3 = 6; 2*3 = 6; 2 ** 3 = 8; 2**3 + 4**5; case_id = file_name.pdf"), "2 * 3 = 6; 2*3 = 6; 2 ** 3 = 8; 2**3 + 4**5; case_id = file_name.pdf");
  assert.equal(toPlainText("[Source](https://example.org/law?q=138) and <https://example.org>"), "Source (https://example.org/law?q=138) and https://example.org");
  assert.equal(toPlainText('<img src=x onerror="alert(1)">'), '<img src=x onerror="alert(1)">');
});

test("plain-text cleaning is idempotent and hides unfinished streamed bold delimiters", () => {
  const text = "### Reply\n1. **Keep your documents**\n2. Contact an advocate.\n**Pending";
  assert.equal(toPlainText(toPlainText(text)), toPlainText(text));
  assert.equal(toPlainText("**Pending"), "Pending");
});

test("typed prompts and suggestion-chip edits never trigger automatic speech", () => {
  const gate = new VoiceReplyGate();
  assert.equal(gate.shouldRead(gate.begin("hi"), "hi", false), false);
  gate.draftChanged("voice");
  gate.draftChanged("typed");
  assert.equal(gate.shouldRead(gate.begin("hi"), "hi", false), false);
});

test("an unedited voice prompt permits reading only its complete non-aborted reply in the same language", () => {
  const gate = new VoiceReplyGate();
  gate.draftChanged("voice");
  const ticket = gate.begin("ta");
  assert.equal(gate.shouldRead(ticket, "ta", false), true);
  assert.equal(gate.shouldRead(ticket, "ta", true), false);
  assert.equal(gate.shouldRead(ticket, "te", false), false);
  gate.invalidate();
  assert.equal(gate.shouldRead(ticket, "ta", false), false);
});

test("late replies cannot speak after cancellation, clear, close or a newer voice prompt", () => {
  const gate = new VoiceReplyGate();
  gate.draftChanged("voice");
  const first = gate.begin("bn");
  gate.invalidate();
  gate.draftChanged("voice");
  const second = gate.begin("bn");
  assert.equal(gate.shouldRead(first, "bn", false), false);
  assert.equal(gate.shouldRead(second, "bn", false), true);
  gate.draftChanged("typed");
  assert.equal(gate.shouldRead(second, "bn", false), false);
});

test("all supported languages have complete chat copy and twelve distinct FAQ suggestions", () => {
  for (const language of Object.keys(CHAT_COPY_ROWS) as Language[]) {
    assert.equal(CHAT_COPY_ROWS[language].length, CHAT_COPY_KEY_COUNT, `${language}: labels`);
    assert.ok(Object.values(chatCopy(language)).every(value => value.trim().length));
    assert.equal(FAQ_ROWS[language].length, FAQ_IDS.length, `${language}: FAQs`);
    assert.equal(new Set(FAQ_ROWS[language]).size, FAQ_IDS.length);
  }
});

test("FAQ suggestions follow page and conversation context, excluding already asked questions", () => {
  const first = chatSuggestions("en", "/advocate/converter", []);
  assert.match(first[0], /IPC/);
  assert.ok(!first.some(question => /our discussion/.test(question)));
  const asked = FAQ_ROWS.hi[0];
  const followup = chatSuggestions("hi", "/", [asked]);
  assert.equal(followup[0], FAQ_ROWS.hi[1]);
  assert.ok(!followup.includes(asked));
  assert.ok(followup.includes(FAQ_ROWS.hi[10]));
});

import assert from "node:assert/strict";
import test from "node:test";
import { ChatSpeechPlayer, selectSpeechVoice, splitSpeechText, waitForSpeechVoices, SPEECH_CHUNK_LENGTH } from "../lib/chat-speech";
import { LANGUAGES } from "../lib/i18n";
import { speechDisclosure } from "../lib/chat-speech-copy";

const voice = (lang: string) => ({ lang } as SpeechSynthesisVoice);
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
const audioResponse = () => new Response(new Uint8Array([1, 2]), { headers: { "Content-Type": "audio/wav" } });

function harness(voices = [voice("en-IN")], fetcher?: typeof fetch, finishAudio = true, failBrowser = false) {
  const states: boolean[] = [], errors: string[] = [], requests: { text: string; language: string }[] = [];
  const spoken: SpeechSynthesisUtterance[] = [], revoked: string[] = [];
  const audios: { paused: boolean; onended: (() => void) | null; onerror: (() => void) | null; src: string; play: () => Promise<void>; pause: () => void; load: () => void; removeAttribute: (name: string) => void }[] = [];
  const synthesis = Object.assign(new EventTarget(), {
    getVoices: () => voices, cancel() {}, resume() {},
    speak(utterance: SpeechSynthesisUtterance) {
      spoken.push(utterance);
      queueMicrotask(() => failBrowser ? utterance.onerror?.({ error: "language-unavailable" } as SpeechSynthesisErrorEvent) : utterance.onend?.({} as SpeechSynthesisEvent));
    },
  }) as unknown as SpeechSynthesis;
  const player = new ChatSpeechPlayer({
    synthesis,
    createUtterance: text => ({ text } as SpeechSynthesisUtterance),
    createAudio: src => {
      const audio = { src, paused: false, onended: null as (() => void) | null, onerror: null as (() => void) | null,
        async play() { if (finishAudio) queueMicrotask(() => audio.onended?.()); },
        pause() { audio.paused = true; }, removeAttribute() { audio.src = ""; }, load() {},
      };
      audios.push(audio);
      return audio as unknown as HTMLAudioElement;
    },
    fetch: fetcher ?? (async (_url, init) => { requests.push(JSON.parse(init!.body as string)); return audioResponse(); }),
    createObjectURL: () => `blob:audio-${audios.length}`,
    revokeObjectURL: url => revoked.push(url),
  }, state => states.push(state), reason => errors.push(reason ?? "failed"));
  return { player, states, errors, requests, spoken, audios, revoked, synthesis };
}

test("Bengali voice matching prefers bn-IN and accepts Bangladesh, script, case and underscore variants", () => {
  const voices = [voice("en-IN"), voice("bn-BD"), voice("BN_in")];
  assert.equal(selectSpeechVoice(voices, "bn"), voices[2]);
  assert.equal(selectSpeechVoice(voices.slice(0, 2), "bn"), voices[1]);
  assert.equal(selectSpeechVoice([voice("BN_Beng_BD")], "bn")?.lang, "BN_Beng_BD");
  assert.equal(selectSpeechVoice([voice("en-IN"), voice("hi-IN")], "bn"), undefined);
});

test("voice loading waits for voiceschanged and cleans up on abort or timeout", async () => {
  let voices: SpeechSynthesisVoice[] = [];
  const synthesis = Object.assign(new EventTarget(), { getVoices: () => voices }) as unknown as SpeechSynthesis;
  const controller = new AbortController();
  const pending = waitForSpeechVoices(synthesis, controller.signal);
  voices = [voice("bn-BD")]; synthesis.dispatchEvent(new Event("voiceschanged"));
  assert.equal((await pending)[0].lang, "bn-BD");
  voices = [];
  const cancelled = waitForSpeechVoices(synthesis, controller.signal);
  controller.abort();
  await assert.rejects(cancelled, { name: "AbortError" });
  assert.deepEqual(await waitForSpeechVoices(synthesis, new AbortController().signal, 1), []);
});

test("long Bengali replies keep every word and punctuation within bounded audio chunks", () => {
  const text = "আপনার প্রশ্নের উত্তর বাংলায় পড়ে শোনানো হচ্ছে। ".repeat(70).trim();
  const chunks = splitSpeechText(text);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => chunk.length > 0 && chunk.length <= SPEECH_CHUNK_LENGTH));
  assert.equal(chunks.join(" "), text);
  assert.equal(splitSpeechText("😀".repeat(700)).join(""), "😀".repeat(700));
});

test("a matching Bengali browser voice reads locally without calling the server", async () => {
  const h = harness([voice("en-IN"), voice("bn-BD")]);
  await h.player.play("বাংলায় উত্তর।", "bn");
  assert.equal(h.spoken[0].lang, "bn-BD");
  assert.equal(h.spoken[0].text, "বাংলায় উত্তর।");
  assert.equal(h.requests.length, 0);
  assert.equal(h.states.at(-1), false);
});

test("missing Bengali device voice uses server audio instead of the default English voice", async () => {
  const h = harness();
  await h.player.play("**বাংলায় উত্তর।**", "bn");
  assert.equal(h.spoken.length, 0);
  assert.deepEqual(h.requests, [{ text: "বাংলায় উত্তর।", language: "bn" }]);
  assert.equal(h.audios.length, 1);
  assert.equal(h.audios[0].paused, true);
  assert.deepEqual(h.revoked, ["blob:audio-0"]);
  assert.deepEqual(h.errors, []);
});

test("a browser voice rejected at playback falls back to server audio", async () => {
  const h = harness([voice("bn-IN")], undefined, true, true);
  await h.player.play("নমস্কার।", "bn");
  assert.equal(h.spoken.length, 1);
  assert.equal(h.requests.length, 1);
  assert.deepEqual(h.errors, []);
});

test("replaying the same reply reuses session audio without another provider request", async () => {
  const h = harness();
  await h.player.play("বাংলায় উত্তর।", "bn");
  await h.player.play("বাংলায় উত্তর।", "bn");
  assert.equal(h.requests.length, 1);
  assert.equal(h.audios.length, 2);
  assert.equal(h.revoked.length, 2);
  await h.player.play("বাংলায় উত্তর।", "hi");
  assert.equal(h.requests.length, 2);
});

test("clearing a conversation or account also clears private cached audio", async () => {
  const h = harness();
  await h.player.play("বাংলায় উত্তর।", "bn");
  h.player.clear();
  await h.player.play("বাংলায় উত্তর।", "bn");
  assert.equal(h.requests.length, 2);
});

test("provider usage limits are distinguishable from playback failures", async () => {
  const h = harness(undefined, async () => Response.json({ code: "rate_limited" }, { status: 429 }));
  await h.player.play("বাংলায় উত্তর।", "bn");
  assert.deepEqual(h.errors, ["rate_limited"]);
  assert.equal(h.states.at(-1), false);
});

test("stopping during voice discovery prevents delayed speech and server requests", async () => {
  const voices: SpeechSynthesisVoice[] = [];
  const h = harness(voices);
  const pending = h.player.play("বাংলায় উত্তর।", "bn");
  h.player.stop();
  voices.push(voice("bn-IN")); h.synthesis.dispatchEvent(new Event("voiceschanged"));
  await pending;
  assert.equal(h.requests.length + h.spoken.length, 0);
  assert.deepEqual(h.errors, []);
});

test("stopping native speech detaches callbacks without starting fallback audio", async () => {
  const h = harness([voice("bn-IN")]);
  let utterance: SpeechSynthesisUtterance | undefined;
  h.synthesis.speak = speech => { utterance = speech; };
  const pending = h.player.play("বাংলায় উত্তর।", "bn");
  await tick(); assert.ok(utterance);
  h.player.stop(); await pending;
  assert.equal(utterance.onend, null);
  assert.equal(utterance.onerror, null);
  assert.equal(h.requests.length, 0);
  assert.deepEqual(h.errors, []);
});

test("a cancelled server request cannot play late audio, even if transport ignores abort", async () => {
  let finish!: (response: Response) => void;
  let signal: AbortSignal | undefined;
  const h = harness(undefined, async (_url, init) => { signal = init!.signal as AbortSignal; return new Promise(resolve => { finish = resolve; }); });
  const pending = h.player.play("বাংলায় উত্তর।", "bn");
  await tick(); h.player.stop();
  assert.equal(signal?.aborted, true);
  finish(audioResponse()); await pending;
  assert.equal(h.audios.length, 0);
  assert.deepEqual(h.errors, []);
  assert.equal(h.states.at(-1), false);
});

test("a newer read replaces pending audio and an old completion cannot clear its state", async () => {
  const resolvers: ((response: Response) => void)[] = [];
  const h = harness(undefined, async () => new Promise(resolve => { resolvers.push(resolve); }), false);
  const old = h.player.play("পুরনো উত্তর।", "bn"); await tick();
  const current = h.player.play("নতুন উত্তর।", "bn"); await tick();
  resolvers[0](audioResponse()); await old;
  assert.equal(h.states.at(-1), true);
  assert.equal(h.audios.length, 0);
  resolvers[1](audioResponse()); await tick();
  assert.equal(h.audios.length, 1);
  h.player.stop(); await current;
  assert.equal(h.audios[0].paused, true);
  assert.equal(h.audios[0].onended, null);
  assert.equal(h.revoked.length, 1);
  assert.deepEqual(h.errors, []);
});

test("stopping a long reply releases audio and never requests later chunks", async () => {
  const h = harness(undefined, undefined, false);
  const pending = h.player.play("বাংলায় দীর্ঘ উত্তর। ".repeat(100), "bn");
  await tick(); assert.equal(h.audios.length, 1);
  h.player.stop(); await pending;
  assert.equal(h.requests.length, 1);
  assert.equal(h.revoked.length, 1);
  assert.equal(h.states.at(-1), false);
});

test("server failure reports one recoverable error and clears the speaking state", async () => {
  const h = harness(undefined, async () => Response.json({ error: "unavailable" }, { status: 503 }));
  await h.player.play("বাংলায় উত্তর।", "bn");
  assert.deepEqual(h.errors, ["failed"]);
  assert.equal(h.states.at(-1), false);
  assert.equal(h.audios.length, 0);
});

test("all conversation languages disclose server read-aloud beside the controls", () => {
  for (const language of LANGUAGES) assert.match(speechDisclosure(language.code), /Google Gemini/);
});

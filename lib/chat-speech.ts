import { LANGUAGES, type Language } from "./i18n";
import { toPlainText } from "./plain-text";

export const SPEECH_CHUNK_LENGTH = 600;
const normalizeTag = (tag: string) => tag.replace(/_/g, "-").toLowerCase();

export function selectSpeechVoice<T extends { lang: string }>(voices: readonly T[], language: Language): T | undefined {
  const preferred = normalizeTag(LANGUAGES.find(item => item.code === language)!.speechCode);
  return voices.find(voice => normalizeTag(voice.lang) === preferred)
    ?? voices.find(voice => normalizeTag(voice.lang).split("-")[0] === language);
}

/** Bound each audio response and preserve Bengali punctuation and word boundaries. */
export function splitSpeechText(text: string): string[] {
  let remaining = toPlainText(text).trim();
  const chunks: string[] = [];
  while (remaining.length > SPEECH_CHUNK_LENGTH) {
    const prefix = remaining.slice(0, SPEECH_CHUNK_LENGTH);
    const boundary = Math.max(prefix.lastIndexOf("।"), prefix.lastIndexOf("."), prefix.lastIndexOf("!"), prefix.lastIndexOf("?"), prefix.lastIndexOf("\n"));
    let end = boundary >= SPEECH_CHUNK_LENGTH / 2 ? boundary + 1 : prefix.lastIndexOf(" ");
    if (end < SPEECH_CHUNK_LENGTH / 2) end = SPEECH_CHUNK_LENGTH;
    // Do not split UTF-16 surrogate pairs in text without whitespace.
    if (/[\uD800-\uDBFF]/.test(remaining[end - 1])) end--;
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export async function waitForSpeechVoices(synthesis: SpeechSynthesis, signal: AbortSignal, timeoutMs = 1200): Promise<SpeechSynthesisVoice[]> {
  signal.throwIfAborted();
  const voices = synthesis.getVoices();
  if (voices.length) return voices;
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      synthesis.removeEventListener("voiceschanged", changed);
      signal.removeEventListener("abort", aborted);
    };
    const changed = () => {
      const loaded = synthesis.getVoices();
      if (loaded.length) { cleanup(); resolve(loaded); }
    };
    const aborted = () => { cleanup(); reject(signal.reason); };
    const timer = setTimeout(() => { cleanup(); resolve(synthesis.getVoices()); }, timeoutMs);
    synthesis.addEventListener("voiceschanged", changed);
    signal.addEventListener("abort", aborted, { once: true });
    changed();
  });
}

interface SpeechHost {
  synthesis?: SpeechSynthesis;
  createUtterance: (text: string) => SpeechSynthesisUtterance;
  createAudio: (url: string) => HTMLAudioElement;
  fetch: typeof fetch;
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
}

/** Owns both browser speech and server audio, including pending work and cleanup. */
export class ChatSpeechPlayer {
  private current: AbortController | null = null;

  constructor(private host: SpeechHost, private onState: (speaking: boolean) => void, private onError: () => void) {}

  stop() {
    const previous = this.current;
    this.current = null;
    previous?.abort();
    this.host.synthesis?.cancel();
    this.onState(false);
  }

  async play(text: string, language: Language) {
    this.stop();
    const chunks = splitSpeechText(text);
    if (!chunks.length) return;
    const controller = new AbortController();
    this.current = controller;
    const { signal } = controller;
    this.onState(true);
    try {
      const voices = this.host.synthesis ? await waitForSpeechVoices(this.host.synthesis, signal) : [];
      signal.throwIfAborted();
      const voice = selectSpeechVoice(voices, language);
      for (const chunk of chunks) {
        signal.throwIfAborted();
        if (voice) {
          try { await this.browserChunk(chunk, voice, signal); continue; }
          catch { signal.throwIfAborted(); }
        }
        // Never send Bengali text to an unrelated default (usually English) voice.
        await this.serverChunk(chunk, language, signal);
      }
    } catch {
      if (this.current === controller && !signal.aborted) this.onError();
    } finally {
      if (this.current === controller) this.stop();
    }
  }

  private browserChunk(text: string, voice: SpeechSynthesisVoice, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = this.host.createUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang.replace(/_/g, "-");
      utterance.rate = .95;
      const cleanup = () => {
        utterance.onend = null;
        utterance.onerror = null;
        signal.removeEventListener("abort", aborted);
      };
      const aborted = () => { cleanup(); reject(signal.reason); };
      utterance.onend = () => { cleanup(); resolve(); };
      utterance.onerror = () => { cleanup(); reject(new Error("Browser speech failed")); };
      signal.addEventListener("abort", aborted, { once: true });
      try {
        this.host.synthesis!.resume();
        this.host.synthesis!.speak(utterance);
      } catch (error) { cleanup(); reject(error); }
    });
  }

  private async serverChunk(text: string, language: Language, signal: AbortSignal) {
    const response = await this.host.fetch("/api/speech", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }), signal,
    });
    if (!response.ok || !response.headers.get("Content-Type")?.startsWith("audio/wav")) throw new Error("Read-aloud unavailable");
    const blob = await response.blob();
    signal.throwIfAborted();
    const url = this.host.createObjectURL(blob);
    try {
      const audio = this.host.createAudio(url);
      try {
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => { audio.onended = null; audio.onerror = null; signal.removeEventListener("abort", aborted); };
          const aborted = () => { cleanup(); reject(signal.reason); };
          audio.onended = () => { cleanup(); resolve(); };
          audio.onerror = () => { cleanup(); reject(new Error("Audio playback failed")); };
          signal.addEventListener("abort", aborted, { once: true });
          audio.play().catch(error => { cleanup(); reject(error); });
        });
      } finally { audio.pause(); audio.removeAttribute("src"); audio.load(); }
    } finally { this.host.revokeObjectURL(url); }
  }
}

export function createBrowserSpeechPlayer(onState: (speaking: boolean) => void, onError: () => void) {
  return new ChatSpeechPlayer({
    synthesis: "speechSynthesis" in window && "SpeechSynthesisUtterance" in window ? window.speechSynthesis : undefined,
    createUtterance: text => new SpeechSynthesisUtterance(text),
    createAudio: url => new Audio(url),
    fetch: window.fetch.bind(window),
    createObjectURL: blob => URL.createObjectURL(blob),
    revokeObjectURL: url => URL.revokeObjectURL(url),
  }, onState, onError);
}

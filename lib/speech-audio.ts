export const MAX_SPEECH_AUDIO_BYTES = 4_000_000;

/** Gemini's legacy TTS endpoint returns 24 kHz mono signed 16-bit PCM. */
export function pcmToWav(pcm: Buffer): Buffer {
  if (!pcm.length || pcm.length % 2 || pcm.length > MAX_SPEECH_AUDIO_BYTES - 44) throw new Error("Invalid PCM audio");
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(pcm.length + 36, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22); header.writeUInt32LE(24000, 24); header.writeUInt32LE(48000, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export function geminiSpeechAudio(data: unknown, format: "wav" | "pcm"): Buffer {
  const wire = data as {
    status?: string;
    steps?: { type?: string; content?: { type?: string; mime_type?: string; data?: string }[] }[];
    promptFeedback?: { blockReason?: string };
    candidates?: { finishReason?: string; content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
  };
  let encoded: string | undefined;
  if (format === "wav") {
    const parts = wire.steps?.filter(step => step.type === "model_output").flatMap(step => step.content ?? []).filter(part => part.type === "audio") ?? [];
    if (wire.status !== "completed" || parts.length !== 1 || parts[0].mime_type !== "audio/wav") throw new Error("Invalid WAV response");
    encoded = parts[0].data;
  } else {
    const candidate = wire.candidates?.[0];
    const parts = candidate?.content?.parts?.filter(part => part.inlineData) ?? [];
    if (wire.promptFeedback?.blockReason || candidate?.finishReason !== "STOP" || parts.length !== 1 || !/^audio\/L16;codec=pcm;rate=24000$/i.test(parts[0].inlineData?.mimeType ?? "")) throw new Error("Invalid PCM response");
    encoded = parts[0].inlineData?.data;
  }
  if (!encoded || encoded.length > Math.ceil(MAX_SPEECH_AUDIO_BYTES / 3) * 4) throw new Error("Audio response is too large");
  const decoded = Buffer.from(encoded, "base64");
  const audio = format === "pcm" ? pcmToWav(decoded) : decoded;
  if (audio.length < 44 || audio.length > MAX_SPEECH_AUDIO_BYTES || audio.toString("ascii", 0, 4) !== "RIFF" || audio.toString("ascii", 8, 12) !== "WAVE") throw new Error("Invalid WAV audio");
  return audio;
}

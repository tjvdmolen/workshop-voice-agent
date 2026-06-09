import type { Env } from "../types";

/**
 * Pipecat smart-turn-v2 — native audio turn detection.
 * https://developers.cloudflare.com/workers-ai/models/smart-turn-v2/
 *
 * Given a window of recent audio, it returns whether the speaker has reached
 * a natural end-of-turn (`is_complete`) and a `probability`. This is the
 * "production" alternative to naive silence detection: it understands pauses
 * mid-sentence vs. an actual finished thought, and handles "um, actually..."
 *
 * Trade-off (the workshop teaching moment): it adds one extra inference call
 * in the critical path, so it is slightly slower than a silence timer.
 */
export interface SmartTurnResult {
  isComplete: boolean;
  probability: number;
}

export async function detectTurn(
  env: Env,
  audio: Uint8Array,
): Promise<SmartTurnResult> {
  // Wrap the raw PCM in a WAV container.
  const wav = wrapPCMInWAV(audio, 16000, 1);

  // The binding expects audio as { body: ReadableStream, contentType: string }
  const response = new Response(wav.buffer as ArrayBuffer);

  const result = (await env.AI.run(
    "@cf/pipecat-ai/smart-turn-v2" as keyof AiModels,
    {
      audio: {
        body: response.body,
        contentType: "application/octet-stream",
      },
    } as never,
    {
      gateway: {
        id: "default", // or use a specific gateway name
      },
    },
  )) as { is_complete?: boolean; probability?: number };

  return {
    isComplete: Boolean(result.is_complete),
    probability: typeof result.probability === "number" ? result.probability : 0,
  };
}

/** Build a minimal mono WAV header + PCM payload. */
function wrapPCMInWAV(pcm: Uint8Array, sampleRate: number, channels: number): Uint8Array {
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const dataChunkSize = pcm.length;
  const fileSize = 36 + dataChunkSize;

  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  let offset = 0;

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset++, str.charCodeAt(i));
    }
  }

  writeString("RIFF");
  view.setUint32(offset, fileSize, true); offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2; // PCM
  view.setUint16(offset, channels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2; // bits per sample
  writeString("data");
  view.setUint32(offset, dataChunkSize, true); offset += 4;

  const wav = new Uint8Array(44 + pcm.length);
  wav.set(new Uint8Array(header), 0);
  wav.set(pcm, 44);
  return wav;
}

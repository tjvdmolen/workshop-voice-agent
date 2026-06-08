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
  // The model accepts the recent audio buffer (16kHz linear16 PCM).
  // Input is cast because the type defs model audio differently from the
  // byte-array form the model accepts at runtime.
  const result = (await env.AI.run("@cf/pipecat-ai/smart-turn-v2", {
    audio: [...audio],
  } as never)) as { is_complete?: boolean; probability?: number };

  return {
    isComplete: Boolean(result.is_complete),
    probability: typeof result.probability === "number" ? result.probability : 0,
  };
}

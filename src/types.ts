// Shared types for the voice agent workshop.
// These are used by both the Worker and (conceptually) mirrored in the client.

/** Which strategy decides when the user has finished speaking. */
export type TurnDetectionMode = "silence" | "smart-turn";

/** The two LLMs we expose so attendees can feel the speed/quality trade-off. */
export type LlmModel =
  | "@cf/meta/llama-3.1-8b-instruct-fast"
  | "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

/** Aura TTS voices. See https://developers.cloudflare.com/workers-ai/models/aura-1/ */
export type TtsVoice =
  | "angus"
  | "asteria"
  | "arcas"
  | "orion"
  | "orpheus"
  | "athena"
  | "luna"
  | "zeus"
  | "perseus"
  | "helios"
  | "hera"
  | "stella";

/**
 * Runtime-tunable parameters. Every field maps to a control in the Vue
 * config panel, so attendees can experiment live during the workshop.
 */
export interface SessionConfig {
  turnDetection: TurnDetectionMode;
  /** Silence mode: ms of quiet before we assume the user is done. */
  silenceThresholdMs: number;
  /** Smart-turn mode: how many seconds of trailing audio to analyze. */
  smartTurnBufferSec: number;
  /** Smart-turn mode: probability above which we treat the turn as complete. */
  turnProbabilityThreshold: number;
  llmModel: LlmModel;
  llmTemperature: number;
  llmMaxTokens: number;
  ttsVoice: TtsVoice;
}

/** Which pipeline stage a latency measurement belongs to. */
export type LatencyComponent = "stt" | "turn" | "llm" | "tts" | "total";

// ---- WebSocket message protocol (client <-> Worker) ----

/** Messages the client sends to the Worker. */
export type ClientMessage =
  | { type: "config"; config: Partial<SessionConfig> }
  | { type: "audio"; data: string } // base64-encoded 16kHz linear16 PCM
  | { type: "stop" };

/** Messages the Worker sends back to the client. */
export type ServerMessage =
  | { type: "ready"; config: SessionConfig }
  | { type: "transcript"; text: string; isPartial: boolean }
  | { type: "turn-detected"; mode: TurnDetectionMode; confidence: number }
  | { type: "agent-text"; text: string; isPartial: boolean }
  | { type: "audio"; data: string; mimeType: string } // base64 audio chunk for playback
  | { type: "latency"; component: LatencyComponent; ms: number }
  | { type: "error"; message: string };

/** Cloudflare bindings available to the Worker. */
export interface Env {
  AI: Ai;
  VOICE_SESSION: DurableObjectNamespace;
  ASSETS: Fetcher;
}

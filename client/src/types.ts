// Client-side mirror of the Worker's WebSocket protocol and config shape.
// Keep in sync with ../../src/types.ts.

export type TurnDetectionMode = "silence" | "smart-turn";

export type LlmModel =
  | "@cf/meta/llama-3.1-8b-instruct-fast"
  | "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

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

export interface SessionConfig {
  turnDetection: TurnDetectionMode;
  silenceThresholdMs: number;
  smartTurnBufferSec: number;
  turnProbabilityThreshold: number;
  llmModel: LlmModel;
  llmTemperature: number;
  llmMaxTokens: number;
  ttsVoice: TtsVoice;
}

export type LatencyComponent = "stt" | "turn" | "llm" | "tts" | "total";

export type ClientMessage =
  | { type: "config"; config: Partial<SessionConfig> }
  | { type: "audio"; data: string }
  | { type: "stop" };

export type ServerMessage =
  | { type: "ready"; config: SessionConfig }
  | { type: "transcript"; text: string; isPartial: boolean }
  | { type: "turn-detected"; mode: TurnDetectionMode; confidence: number }
  | { type: "agent-text"; text: string; isPartial: boolean }
  | { type: "audio"; data: string; mimeType: string }
  | { type: "latency"; component: LatencyComponent; ms: number }
  | { type: "error"; message: string };

export const TTS_VOICES: TtsVoice[] = [
  "asteria",
  "luna",
  "stella",
  "athena",
  "hera",
  "orion",
  "arcas",
  "perseus",
  "angus",
  "orpheus",
  "helios",
  "zeus",
];

export const LLM_MODELS: { value: LlmModel; label: string }[] = [
  { value: "@cf/meta/llama-3.1-8b-instruct-fast", label: "Llama 3.1 8B (fast)" },
  { value: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", label: "Llama 3.3 70B (smart)" },
];

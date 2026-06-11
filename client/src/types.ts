// Client-side mirror of the Worker's WebSocket protocol and config shape.
// Keep in sync with ../../src/types.ts.

export type TurnDetectionMode = "silence" | "smart-turn";

export type SttModel = "@cf/deepgram/flux" | "@cf/deepgram/nova-3";

export type SttLanguage =
  | "en"
  | "en-US"
  | "en-AU"
  | "en-GB"
  | "en-IN"
  | "en-NZ"
  | "es"
  | "es-419"
  | "fr"
  | "fr-CA"
  | "de"
  | "de-CH"
  | "hi"
  | "ru"
  | "pt"
  | "pt-BR"
  | "pt-PT"
  | "ja"
  | "it"
  | "nl"
  | "multi";

export type LlmModel =
  | "@cf/meta/llama-3.1-8b-instruct-fast"
  | "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export type TtsModel =
  | "@cf/deepgram/aura-1"
  | "@cf/deepgram/aura-2-en"
  | "@cf/deepgram/aura-2-es"
  | "@cf/myshell-ai/melotts";

export type TtsVoice =
  // MeloTTS
  | "default"
  // Aura-1 voices
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
  | "stella"
  // Aura-2-en voices
  | "amalthea"
  | "andromeda"
  | "apollo"
  | "aries"
  | "atlas"
  | "aurora"
  | "callista"
  | "cora"
  | "cordelia"
  | "delia"
  | "draco"
  | "electra"
  | "harmonia"
  | "helena"
  | "hermes"
  | "hyperion"
  | "iris"
  | "janus"
  | "juno"
  | "jupiter"
  | "mars"
  | "minerva"
  | "neptune"
  | "odysseus"
  | "ophelia"
  | "pandora"
  | "phoebe"
  | "pluto"
  | "saturn"
  | "thalia"
  | "theia"
  | "vesta"
  // Aura-2-es voices
  | "sirio"
  | "nestor"
  | "carina"
  | "celeste"
  | "alvaro"
  | "diana"
  | "aquila"
  | "selena"
  | "estrella"
  | "javier";

export interface SessionConfig {
  sttModel: SttModel;
  turnDetection: TurnDetectionMode;
  silenceThresholdMs: number;
  smartTurnBufferSec: number;
  turnProbabilityThreshold: number;
  llmModel: LlmModel;
  llmTemperature: number;
  llmMaxTokens: number;
  ttsModel: TtsModel;
  ttsVoice: TtsVoice;
  language: SttLanguage;
  ttsLanguage: SttLanguage;
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

export const AURA_1_VOICES: TtsVoice[] = [
  "angus", "asteria", "arcas", "orion", "orpheus",
  "athena", "luna", "zeus", "perseus", "helios", "hera", "stella",
];

export const AURA_2_EN_VOICES: TtsVoice[] = [
  "amalthea", "andromeda", "apollo", "arcas", "aries", "asteria",
  "athena", "atlas", "aurora", "callista", "cora", "cordelia", "delia",
  "draco", "electra", "harmonia", "helena", "hera", "hermes", "hyperion",
  "iris", "janus", "juno", "jupiter", "luna", "mars", "minerva",
  "neptune", "odysseus", "ophelia", "orion", "orpheus", "pandora",
  "phoebe", "pluto", "saturn", "thalia", "theia", "vesta", "zeus",
];

export const AURA_2_ES_VOICES: TtsVoice[] = [
  "sirio", "nestor", "carina", "celeste", "alvaro",
  "diana", "aquila", "selena", "estrella", "javier",
];

export const MELOTTs_VOICES: TtsVoice[] = ["default"];

export const LLM_MODELS: { value: LlmModel; label: string }[] = [
  { value: "@cf/meta/llama-3.1-8b-instruct-fast", label: "Llama 3.1 8B (fast)" },
  { value: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", label: "Llama 3.3 70B (smart)" },
];

export const TTS_MODELS: { value: TtsModel; label: string }[] = [
  { value: "@cf/deepgram/aura-1", label: "Aura-1 (Deepgram)" },
  { value: "@cf/deepgram/aura-2-en", label: "Aura-2 English (Deepgram)" },
  { value: "@cf/deepgram/aura-2-es", label: "Aura-2 Spanish (Deepgram)" },
  { value: "@cf/myshell-ai/melotts", label: "MeloTTS (MyShell, multilingual)" },
];

export const LANGUAGES: { value: SttLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "en-US", label: "English (US)" },
  { value: "en-AU", label: "English (AU)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "en-IN", label: "English (IN)" },
  { value: "en-NZ", label: "English (NZ)" },
  { value: "es", label: "Spanish" },
  { value: "es-419", label: "Spanish (Latin America)" },
  { value: "fr", label: "French" },
  { value: "fr-CA", label: "French (Canada)" },
  { value: "de", label: "German" },
  { value: "de-CH", label: "German (Swiss)" },
  { value: "hi", label: "Hindi" },
  { value: "ru", label: "Russian" },
  { value: "pt", label: "Portuguese" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "pt-PT", label: "Portuguese (Portugal)" },
  { value: "ja", label: "Japanese" },
  { value: "it", label: "Italian" },
  { value: "nl", label: "Dutch" },
  { value: "multi", label: "Multilingual (auto-detect)" },
];

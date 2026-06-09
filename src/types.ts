// Shared types for the voice agent workshop.
// These are used by both the Worker and (conceptually) mirrored in the client.

/** Which strategy decides when the user has finished speaking. */
export type TurnDetectionMode = "silence" | "smart-turn";

/** The two LLMs we expose so attendees can feel the speed/quality trade-off. */
export type LlmModel =
  | "@cf/meta/llama-3.1-8b-instruct-fast"
  | "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

/** Supported text-to-speech models. */
export type TtsModel =
  | "@cf/deepgram/aura-1"
  | "@cf/deepgram/aura-2-en"
  | "@cf/deepgram/aura-2-es"
  | "@cf/myshell-ai/melotts";

/** TTS voices across all supported models.
 * Aura-1: https://developers.cloudflare.com/workers-ai/models/aura-1/
 * Aura-2-en: https://developers.cloudflare.com/workers-ai/models/aura-2-en/
 * Aura-2-es: https://developers.cloudflare.com/workers-ai/models/aura-2-es/
 */
export type TtsVoice =
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

/** Supported speech-to-text models. */
export type SttModel = "@cf/deepgram/flux" | "@cf/deepgram/nova-3";

/** Nova-3 supported languages. Use "multi" for automatic detection. */
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

/**
 * Runtime-tunable parameters. Every field maps to a control in the Vue
 * config panel, so attendees can experiment live during the workshop.
 */
export interface SessionConfig {
  sttModel: SttModel;
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
  ttsModel: TtsModel;
  ttsVoice: TtsVoice;
  /** STT language. Nova-3 supports 10 languages + multilingual. */
  language: SttLanguage;
  /** TTS language. MeloTTS needs an explicit language (falls back to 'en' if not set). */
  ttsLanguage: SttLanguage;
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

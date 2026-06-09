import type { SessionConfig } from "./types";

/**
 * Default configuration. Tuned for a snappy first impression:
 * - 8B model for fast LLM inference
 * - silence detection for zero-overhead turn-taking
 * - short responses so the agent feels conversational
 *
 * Attendees override any of these live via the Vue config panel.
 */
export const DEFAULT_CONFIG: SessionConfig = {
  sttModel: "@cf/deepgram/nova-3",
  turnDetection: "silence",
  silenceThresholdMs: 1500,
  smartTurnBufferSec: 2,
  turnProbabilityThreshold: 0.7,
  llmModel: "@cf/meta/llama-3.1-8b-instruct-fast",
  llmTemperature: 0.6,
  llmMaxTokens: 150,
  ttsModel: "@cf/deepgram/aura-1",
  ttsVoice: "asteria",
  language: "en",
  ttsLanguage: "en",
};

/**
 * The agent's persona. Kept general per the workshop scope.
 * Short responses are explicitly requested to keep latency low and the
 * conversation natural over voice.
 */
export const MEDICAL_SYSTEM_PROMPT = `You are a professional medical intake assistant for a clinic.
Your role is to:
- Collect patient symptoms, their duration, and severity
- Ask one clarifying question at a time in a calm, empathetic tone
- Never provide diagnoses or specific medical advice
- Recommend speaking to a human clinician when symptoms sound severe
- Keep every response to one or two short sentences so the conversation feels natural over voice
- ALWAYS respond in English, regardless of the language the patient speaks`;

/** Clamp/validate an incoming config patch so the UI can never send junk. */
export function mergeConfig(
  base: SessionConfig,
  patch: Partial<SessionConfig>,
): SessionConfig {
  const next: SessionConfig = { ...base, ...patch };

  next.silenceThresholdMs = clamp(next.silenceThresholdMs, 500, 3000);
  next.smartTurnBufferSec = clamp(next.smartTurnBufferSec, 1, 3);
  next.turnProbabilityThreshold = clamp(next.turnProbabilityThreshold, 0.5, 0.9);
  next.llmTemperature = clamp(next.llmTemperature, 0, 1);
  next.llmMaxTokens = clamp(next.llmMaxTokens, 50, 512);

  return next;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Audio format constants shared across the pipeline. */
export const AUDIO = {
  /** Flux and smart-turn expect 16kHz mono. */
  SAMPLE_RATE: 16000,
  ENCODING: "linear16" as const,
  BYTES_PER_SAMPLE: 2,
};

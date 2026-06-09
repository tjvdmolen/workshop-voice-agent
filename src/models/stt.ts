import type { Env, SttLanguage, SttModel } from "../types";
import { FluxStream } from "./flux";
import { Nova3Stream } from "./nova3";

/**
 * Common interface for streaming speech-to-text providers.
 * Both Flux and Nova-3 implement this so the session can switch between them.
 */
export interface SttCallbacks {
  /** Called with each transcript update. `isFinal` marks an end-of-utterance. */
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (err: unknown) => void;
  onClose: () => void;
}

export interface SttStream {
  connect(): Promise<void>;
  sendAudio(pcm: ArrayBuffer | Uint8Array): void;
  close(): void;
}

/** Factory: create the right STT stream based on the configured model. */
export function createSttStream(
  env: Env,
  model: SttModel,
  language: SttLanguage,
  callbacks: SttCallbacks,
): SttStream {
  switch (model) {
    case "@cf/deepgram/flux":
      return new FluxStream(env, callbacks);
    case "@cf/deepgram/nova-3":
      return new Nova3Stream(env, language, callbacks);
    default:
      throw new Error(`Unknown STT model: ${model}`);
  }
}

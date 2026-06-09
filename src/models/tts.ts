import type { Env, SttLanguage, TtsModel, TtsVoice } from "../types";
import { extractSentences as auraExtractSentences } from "./aura";

/**
 * Common interface for text-to-speech providers.
 * Both Aura-1 and MeloTTS implement this so the session can switch between them.
 */
export interface TtsProvider {
  synthesize(text: string): Promise<ArrayBuffer>;
  readonly mimeType: string;
  extractSentences(buffer: string): { sentences: string[]; rest: string };
}

/** Factory: create the right TTS provider based on the configured model. */
export function createTtsProvider(
  env: Env,
  model: TtsModel,
  voice: TtsVoice,
  ttsLanguage: SttLanguage,
): TtsProvider {
  switch (model) {
    case "@cf/deepgram/aura-1":
      return new AuraProvider(env, voice);
    case "@cf/deepgram/aura-2-en":
      return new Aura2Provider(env, "@cf/deepgram/aura-2-en", voice);
    case "@cf/deepgram/aura-2-es":
      return new Aura2Provider(env, "@cf/deepgram/aura-2-es", voice);
    case "@cf/myshell-ai/melotts":
      return new MeloTtsProvider(env, ttsLanguage);
    default:
      throw new Error(`Unknown TTS model: ${model}`);
  }
}

/** Deepgram Aura-1 provider. */
class AuraProvider implements TtsProvider {
  readonly mimeType = "audio/mpeg";

  constructor(
    private env: Env,
    private voice: TtsVoice,
  ) {}

  async synthesize(text: string): Promise<ArrayBuffer> {
    const response = (await this.env.AI.run(
      "@cf/deepgram/aura-1" as keyof AiModels,
      {
        text,
        speaker: this.voice,
        encoding: "mp3",
      } as never,
      {
        returnRawResponse: true,
        gateway: {
          id: "default", // or use a specific gateway name
        },
      },
    )) as unknown as Response;

    return await response.arrayBuffer();
  }

  extractSentences(buffer: string): { sentences: string[]; rest: string } {
    return auraExtractSentences(buffer);
  }
}

/** Deepgram Aura-2 provider (supports aura-2-en and aura-2-es). */
class Aura2Provider implements TtsProvider {
  readonly mimeType = "audio/mpeg";

  constructor(
    private env: Env,
    private model: "@cf/deepgram/aura-2-en" | "@cf/deepgram/aura-2-es",
    private voice: TtsVoice,
  ) {}

  async synthesize(text: string): Promise<ArrayBuffer> {
    const response = (await this.env.AI.run(
      this.model as keyof AiModels,
      {
        text,
        speaker: this.voice,
        encoding: "mp3",
      } as never,
      {
        returnRawResponse: true,
        gateway: {
          id: "default", // or use a specific gateway name
        },
      },
    )) as unknown as Response;

    return await response.arrayBuffer();
  }

  extractSentences(buffer: string): { sentences: string[]; rest: string } {
    return auraExtractSentences(buffer);
  }
}

/** MyShell MeloTTS provider. */
class MeloTtsProvider implements TtsProvider {
  readonly mimeType = "audio/mpeg";

  constructor(
    private env: Env,
    private ttsLanguage: SttLanguage,
  ) {
    console.log(`[MeloTtsProvider] Created with language: ${ttsLanguage}`);
  }

  async synthesize(text: string): Promise<ArrayBuffer> {
    const lang = this.ttsLanguage === "multi" ? "en" : this.ttsLanguage;
    console.log(`[MeloTtsProvider] Synthesizing with lang=${lang}, text="${text.substring(0, 50)}..."`);
    
    const result = await this.env.AI.run(
      "@cf/myshell-ai/melotts" as keyof AiModels,
      {
        prompt: text,
        lang,
      } as never,
      {
        gateway: {
          id: "default", // or use a specific gateway name
        },
      },
    );
    
    console.log(`[MeloTtsProvider] Result type: ${typeof result}, has audio: ${typeof result === 'object' && result !== null ? 'audio' in result : false}`);

    // MeloTTS might return either { audio: string } or raw bytes
    if (typeof result === 'object' && result !== null && 'audio' in result) {
      const audioResult = result as { audio?: string };
      if (!audioResult.audio) {
        throw new Error("MeloTTS did not return audio");
      }
      return base64ToArrayBuffer(audioResult.audio);
    } else if (result instanceof ArrayBuffer) {
      return result;
    } else if (result instanceof Uint8Array) {
      return result.buffer as ArrayBuffer;
    } else {
      throw new Error(`MeloTTS returned unexpected type: ${typeof result}`);
    }
  }

  extractSentences(buffer: string): { sentences: string[]; rest: string } {
    return auraExtractSentences(buffer);
  }
}

/** Decode base64 string into ArrayBuffer. */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

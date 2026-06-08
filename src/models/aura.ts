import type { Env, TtsVoice } from "../types";

/**
 * Deepgram Aura — context-aware text-to-speech.
 * https://developers.cloudflare.com/workers-ai/models/aura-1/
 *
 * Streaming strategy:
 * We synthesize one *sentence at a time* as the LLM produces it, rather than
 * waiting for the whole answer. Each sentence becomes an audio chunk that is
 * streamed straight to the browser, so the agent starts talking almost
 * immediately. This gives true streaming behavior using the simple, robust
 * binding API.
 *
 * Production upgrade: Aura also supports a persistent WebSocket
 * (type: "Speak" / type: "Flush") for token-level streaming. The binding
 * approach below is easier to reason about for a workshop and avoids managing
 * a second long-lived socket per session.
 */
export async function synthesizeSentence(
  env: Env,
  text: string,
  voice: TtsVoice,
): Promise<ArrayBuffer> {
  // returnRawResponse gives us the audio bytes directly (MP3 by default).
  const response = (await env.AI.run(
    "@cf/deepgram/aura-1",
    {
      text,
      speaker: voice,
      encoding: "mp3",
    },
    { returnRawResponse: true },
  )) as unknown as Response;

  return await response.arrayBuffer();
}

/** The MIME type the browser uses to decode Aura output. */
export const AURA_MIME_TYPE = "audio/mpeg";

/**
 * Splits a growing text buffer into complete sentences, returning the
 * finished sentences and the leftover (incomplete) tail. Lets us flush each
 * sentence to TTS the moment it is ready.
 */
export function extractSentences(buffer: string): {
  sentences: string[];
  rest: string;
} {
  const sentences: string[] = [];
  // Match up to a sentence-ending punctuation mark followed by space/end.
  const regex = /[^.!?]+[.!?]+(\s|$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(buffer)) !== null) {
    sentences.push(match[0].trim());
    lastIndex = regex.lastIndex;
  }

  return { sentences, rest: buffer.slice(lastIndex) };
}

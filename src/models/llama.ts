import { MEDICAL_SYSTEM_PROMPT } from "../config";
import type { Env, LlmModel } from "../types";

/**
 * Llama text generation via Workers AI.
 * https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fast/
 *
 * We stream the response (SSE) so we can begin synthesizing speech for the
 * first sentence before the full answer is generated. That overlap is the
 * single biggest perceived-latency win in the whole pipeline.
 */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface LlamaStreamOptions {
  model: LlmModel;
  temperature: number;
  maxTokens: number;
  history: ChatTurn[];
}

/**
 * Streams tokens from the LLM. `onToken` fires per incremental chunk.
 * Returns the full concatenated response once complete.
 */
export async function streamLlm(
  env: Env,
  options: LlamaStreamOptions,
  onToken: (token: string) => void,
): Promise<string> {
  const messages = [
    { role: "system", content: MEDICAL_SYSTEM_PROMPT },
    ...options.history,
  ];

  // The model name and input are cast because the installed
  // @cloudflare/workers-types may predate these model identifiers. Both are
  // valid at runtime on Workers AI.
  const result = await env.AI.run(
    options.model as keyof AiModels,
    {
      messages,
      stream: true,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    } as never,
    {
      gateway: {
        id: "default", // or use a specific gateway name
      },
    },
  );

  // The binding may return the stream directly or wrapped in a response object.
  const stream =
    result instanceof ReadableStream
      ? (result as ReadableStream<Uint8Array>)
      : (result as unknown as { readable: ReadableStream<Uint8Array> })?.readable ??
        (result as unknown as { body: ReadableStream<Uint8Array> })?.body;

  if (!stream) {
    throw new Error("LLM streaming response did not contain a readable stream.");
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Workers AI streams either SSE ("data: {...}") or NDJSON ("{...}").
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let data = trimmed;
      // Strip SSE prefix if present.
      if (trimmed.startsWith("data:")) {
        data = trimmed.slice("data:".length).trim();
      }
      if (data === "[DONE]") continue;

      try {
        const json = JSON.parse(data);
        // The binding may emit { response: string } or { response: string, p: string }.
        const token: string = json.response ?? "";
        if (token) {
          full += token;
          onToken(token);
        }
      } catch {
        // Partial JSON across chunk boundaries — safe to ignore.
      }
    }
  }

  return full.trim();
}

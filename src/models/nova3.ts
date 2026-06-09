import { AUDIO } from "../config";
import type { Env, SttLanguage } from "../types";
import type { SttCallbacks, SttStream } from "./stt";

/**
 * Deepgram Nova-3 — streaming speech-to-text with multilingual support.
 * https://developers.cloudflare.com/workers-ai/models/nova-3/
 *
 * Nova-3 supports 10 languages + automatic multilingual detection ("multi").
 * It works over WebSocket for real-time streaming voice agents.
 */
export class Nova3Stream implements SttStream {
  private ws: WebSocket | null = null;

  constructor(
    private env: Env,
    private language: SttLanguage,
    private callbacks: SttCallbacks,
  ) {}

  /** Open the WebSocket to the Nova-3 model via the AI binding. */
  async connect(): Promise<void> {
    const params: Record<string, string> = {
      encoding: AUDIO.ENCODING,
      sample_rate: String(AUDIO.SAMPLE_RATE),
    };
    if (this.language !== "multi") {
      params.language = this.language;
    }

    const response = await this.env.AI.run(
      "@cf/deepgram/nova-3" as keyof AiModels,
      params as never,
      {
        websocket: true,
        gateway: {
          id: "default", // or use a specific gateway name
        },
      },
    );

    const ws = (response as unknown as { webSocket: WebSocket | null }).webSocket;
    if (!ws) {
      throw new Error("Nova-3 did not return a WebSocket. Check Workers AI access.");
    }

    ws.accept();
    this.ws = ws;

    ws.addEventListener("message", (event: MessageEvent) => {
      try {
        const payload = typeof event.data === "string" ? event.data : "";
        if (!payload) return;
        const msg = JSON.parse(payload);

        // Nova-3 event shapes: transcript, is_final, speech_final, channel.alternatives[0].transcript
        const text: string =
          msg.transcript ?? msg.text ?? msg.channel?.alternatives?.[0]?.transcript ?? "";
        const isFinal: boolean = Boolean(msg.is_final ?? msg.speech_final ?? false);

        if (text) {
          this.callbacks.onTranscript(text, isFinal);
        }
      } catch (err) {
        this.callbacks.onError(err);
      }
    });

    ws.addEventListener("error", (err: Event) => this.callbacks.onError(err));
    ws.addEventListener("close", () => this.callbacks.onClose());
  }

  /** Forward a chunk of raw PCM audio to Nova-3. */
  sendAudio(pcm: ArrayBuffer | Uint8Array): void {
    if (!this.ws) return;
    this.ws.send(pcm);
  }

  close(): void {
    try {
      this.ws?.close();
    } catch {
      // already closed
    }
    this.ws = null;
  }
}

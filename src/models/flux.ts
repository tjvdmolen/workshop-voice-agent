import { AUDIO } from "../config";
import type { Env } from "../types";

/**
 * Deepgram Flux — streaming speech-to-text built for voice agents.
 * https://developers.cloudflare.com/workers-ai/models/flux/
 *
 * Flux is WebSocket-only: it needs a live bi-directional stream so it can
 * recognize speech activity in real time. We open the connection once per
 * conversation and feed it raw 16kHz linear16 PCM as the user speaks.
 */
export interface FluxCallbacks {
  /** Called with each transcript update. `isFinal` marks an end-of-utterance. */
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (err: unknown) => void;
  onClose: () => void;
}

export class FluxStream {
  private ws: WebSocket | null = null;

  constructor(
    private env: Env,
    private callbacks: FluxCallbacks,
  ) {}

  /** Open the WebSocket to the Flux model via the AI binding. */
  async connect(): Promise<void> {
    // `websocket: true` makes the binding return a Response carrying a
    // WebSocket we can accept and stream audio over.
    const response = await this.env.AI.run(
      "@cf/deepgram/flux",
      {
        encoding: AUDIO.ENCODING,
        sample_rate: String(AUDIO.SAMPLE_RATE),
      },
      { websocket: true },
    );

    const ws = (response as unknown as { webSocket: WebSocket | null }).webSocket;
    if (!ws) {
      throw new Error("Flux did not return a WebSocket. Check Workers AI access.");
    }

    ws.accept();
    this.ws = ws;

    ws.addEventListener("message", (event: MessageEvent) => {
      try {
        // Flux returns JSON transcript events.
        const payload = typeof event.data === "string" ? event.data : "";
        if (!payload) return;
        const msg = JSON.parse(payload);

        // Flux event shapes vary; we defensively read the common fields.
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

  /** Forward a chunk of raw PCM audio to Flux. */
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

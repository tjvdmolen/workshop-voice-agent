import { AUDIO, DEFAULT_CONFIG, mergeConfig } from "./config";
import { FluxStream } from "./models/flux";
import { detectTurn } from "./models/smart-turn";
import { streamLlm, type ChatTurn } from "./models/llama";
import { AURA_MIME_TYPE, extractSentences, synthesizeSentence } from "./models/aura";
import { base64ToBytes, bytesToBase64, concatBytes, tailBytes } from "./utils";
import type {
  ClientMessage,
  Env,
  LatencyComponent,
  ServerMessage,
  SessionConfig,
} from "./types";

/**
 * VoiceSession is a Durable Object: exactly one instance backs each active
 * conversation. It owns all conversation state and orchestrates the full
 * pipeline: Flux STT -> turn detection -> Llama LLM -> Aura TTS.
 */
export class VoiceSession implements DurableObject {
  private clientWs: WebSocket | null = null;
  private flux: FluxStream | null = null;

  private config: SessionConfig = { ...DEFAULT_CONFIG };
  private history: ChatTurn[] = [];

  // Turn-taking state.
  private currentTranscript = "";
  private latestPartial = ""; // fallback when finals are not sent
  private lastAudioAt = 0;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private smartTurnBuffer: Uint8Array = new Uint8Array(0);
  private processing = false;

  // Per-turn latency tracking.
  private turnStartedAt = 0;
  private sttFirstTokenAt = 0;

  constructor(
    _state: DurableObjectState,
    private env: Env,
  ) {}

  /** Entry point: upgrade the request to a WebSocket and wire up handlers. */
  async fetch(_request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();
    this.clientWs = server;

    server.addEventListener("message", (event: MessageEvent) => {
      this.handleClientMessage(event.data).catch((err) =>
        this.send({ type: "error", message: String(err) }),
      );
    });

    server.addEventListener("close", () => this.cleanup());

    this.send({ type: "ready", config: this.config });

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleClientMessage(raw: unknown): Promise<void> {
    if (typeof raw !== "string") return;
    const msg = JSON.parse(raw) as ClientMessage;

    switch (msg.type) {
      case "config":
        this.config = mergeConfig(this.config, msg.config);
        this.send({ type: "ready", config: this.config });
        break;

      case "audio":
        await this.onAudioChunk(base64ToBytes(msg.data));
        break;

      case "stop":
        this.cleanup();
        break;
    }
  }

  /** Handle one chunk of microphone PCM from the client. */
  private async onAudioChunk(pcm: Uint8Array): Promise<void> {
    if (this.processing) return; // ignore mic input while the agent is responding

    // Only treat non-silent audio as "activity" for turn detection.
    // ScriptProcessorNode sends continuous buffers even when the mic is quiet.
    const isSilent = this.computeSilence(pcm);
    if (!isSilent) {
      this.lastAudioAt = Date.now();
      if (this.turnStartedAt === 0) this.turnStartedAt = this.lastAudioAt;
    }

    // Lazily open the Flux connection on first audio.
    if (!this.flux) {
      console.log("[VoiceSession] Opening Flux connection...");
      await this.openFlux();
    }

    // Forward to Flux for transcription (Flux can handle silence itself).
    this.flux?.sendAudio(pcm);

    if (this.config.turnDetection === "silence") {
      // Only reset the silence timer on actual speech, not on silent buffers.
      if (!isSilent) {
        this.scheduleSilenceCheck();
      }
    } else {
      // Smart-turn: keep a sliding window of recent audio and ask the model.
      this.smartTurnBuffer = tailBytes(
        concatBytes(this.smartTurnBuffer, pcm),
        this.config.smartTurnBufferSec * AUDIO.SAMPLE_RATE * AUDIO.BYTES_PER_SAMPLE,
      );
      await this.checkSmartTurn();
    }
  }

  /** Returns true if the PCM buffer is effectively silent (low energy). */
  private computeSilence(pcm: Uint8Array): boolean {
    let sum = 0;
    const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    for (let i = 0; i < pcm.byteLength; i += 2) {
      sum += Math.abs(view.getInt16(i, true));
    }
    const avg = sum / (pcm.byteLength / 2);
    // Threshold tuned for 16-bit PCM: < 150 avg amplitude is background noise.
    return avg < 150;
  }

  private async openFlux(): Promise<void> {
    this.flux = new FluxStream(this.env, {
      onTranscript: (text, isFinal) => {
        if (this.sttFirstTokenAt === 0 && this.turnStartedAt > 0) {
          this.sttFirstTokenAt = Date.now();
          this.reportLatency("stt", this.sttFirstTokenAt - this.turnStartedAt);
        }
        console.log(`[Flux] transcript="${text}" isFinal=${isFinal}`);
        // Accumulate finals; keep latest partial as fallback.
        if (isFinal) {
          this.currentTranscript += (this.currentTranscript ? " " : "") + text;
          this.latestPartial = "";
        } else {
          this.latestPartial = text;
        }
        this.send({ type: "transcript", text, isPartial: !isFinal });
      },
      onError: (err) => this.send({ type: "error", message: `Flux: ${String(err)}` }),
      onClose: () => {},
    });
    await this.flux.connect();
  }

  // ---- Turn detection: silence mode ----

  private scheduleSilenceCheck(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      const quietFor = Date.now() - this.lastAudioAt;
      const transcript = this.currentTranscript || this.latestPartial;
      console.log(`[SilenceCheck] quietFor=${quietFor}ms transcript="${transcript}"`);
      if (quietFor >= this.config.silenceThresholdMs && transcript) {
        this.send({ type: "turn-detected", mode: "silence", confidence: 1 });
        void this.respond();
      }
    }, this.config.silenceThresholdMs);
  }

  // ---- Turn detection: smart-turn mode ----

  private async checkSmartTurn(): Promise<void> {
    const transcript = this.currentTranscript || this.latestPartial;
    if (!transcript) return;

    const startedAt = Date.now();
    const result = await detectTurn(this.env, this.smartTurnBuffer);
    this.reportLatency("turn", Date.now() - startedAt);

    if (result.isComplete && result.probability >= this.config.turnProbabilityThreshold) {
      this.send({
        type: "turn-detected",
        mode: "smart-turn",
        confidence: result.probability,
      });
      await this.respond();
    }
  }

  // ---- Response pipeline: LLM -> TTS ----

  private async respond(): Promise<void> {
    const transcript = this.currentTranscript || this.latestPartial;
    console.log(`[respond] called with transcript="${transcript}"`);
    if (this.processing || !transcript) return;
    this.processing = true;
    if (this.silenceTimer) clearTimeout(this.silenceTimer);

    const userText = transcript;
    this.currentTranscript = "";
    this.latestPartial = "";
    this.history.push({ role: "user", content: userText });
    console.log(`[respond] Sending to LLM: "${userText}"`);

    try {
      const llmStartedAt = Date.now();
      let llmFirstTokenAt = 0;
      let ttsBuffer = "";
      const ttsStartedAt = { value: 0 };

      const fullResponse = await streamLlm(
        this.env,
        {
          model: this.config.llmModel,
          temperature: this.config.llmTemperature,
          maxTokens: this.config.llmMaxTokens,
          history: this.history,
        },
        (token) => {
          if (llmFirstTokenAt === 0) {
            llmFirstTokenAt = Date.now();
            this.reportLatency("llm", llmFirstTokenAt - llmStartedAt);
          }
          this.send({ type: "agent-text", text: token, isPartial: true });

          // Flush complete sentences to TTS as soon as they form.
          ttsBuffer += token;
          const { sentences, rest } = extractSentences(ttsBuffer);
          ttsBuffer = rest;
          for (const sentence of sentences) {
            this.speak(sentence, ttsStartedAt).catch((err) => {
              this.send({ type: "error", message: `TTS failed: ${String(err)}` });
            });
          }
        },
      );

      // Speak any trailing text that did not end with punctuation.
      if (ttsBuffer.trim()) {
        await this.speak(ttsBuffer.trim(), ttsStartedAt);
      }

      this.history.push({ role: "assistant", content: fullResponse });
      this.send({ type: "agent-text", text: fullResponse, isPartial: false });
      this.reportLatency("total", Date.now() - this.turnStartedAt);
    } catch (err) {
      this.send({ type: "error", message: `Response failed: ${String(err)}` });
    } finally {
      // Reset for the next turn.
      this.processing = false;
      this.turnStartedAt = 0;
      this.sttFirstTokenAt = 0;
      this.latestPartial = "";
      this.smartTurnBuffer = new Uint8Array(0);
    }
  }

  /** Synthesize one sentence and stream the audio to the client. */
  private async speak(sentence: string, ttsStartedAt: { value: number }): Promise<void> {
    const startedAt = Date.now();
    const audio = await synthesizeSentence(this.env, sentence, this.config.ttsVoice);

    // Report TTS latency only for the first sentence (time-to-first-audio).
    if (ttsStartedAt.value === 0) {
      ttsStartedAt.value = startedAt;
      this.reportLatency("tts", Date.now() - startedAt);
    }

    this.send({
      type: "audio",
      data: bytesToBase64(audio),
      mimeType: AURA_MIME_TYPE,
    });
  }

  private reportLatency(component: LatencyComponent, ms: number): void {
    this.send({ type: "latency", component, ms });
  }

  private send(message: ServerMessage): void {
    try {
      this.clientWs?.send(JSON.stringify(message));
    } catch {
      // socket gone
    }
  }

  private cleanup(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.flux?.close();
    this.flux = null;
  }
}

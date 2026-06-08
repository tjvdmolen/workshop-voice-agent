/**
 * Captures microphone audio and emits 16kHz mono linear16 PCM chunks,
 * base64-encoded, ready to send to the Worker -> Flux.
 *
 * Flux expects raw signed little-endian 16-bit PCM at 16kHz. We request a
 * 16kHz AudioContext and convert the Float32 samples the browser gives us
 * into Int16 before encoding.
 */
export interface AudioCapture {
  start: (onChunk: (base64Pcm: string) => void) => Promise<void>;
  stop: () => void;
}

const TARGET_SAMPLE_RATE = 16000;

export function useAudioCapture(): AudioCapture {
  let context: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  let stream: MediaStream | null = null;

  async function start(onChunk: (base64Pcm: string) => void): Promise<void> {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    // Request 16kHz directly so we avoid a separate resampling step.
    context = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
    source = context.createMediaStreamSource(stream);

    // ScriptProcessorNode is deprecated but is the simplest cross-browser way
    // to grab raw PCM for a workshop. (Production: migrate to AudioWorklet.)
    processor = context.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0); // Float32 [-1, 1]
      const pcm16 = floatTo16BitPCM(input);
      onChunk(bytesToBase64(new Uint8Array(pcm16.buffer)));
    };

    source.connect(processor);
    processor.connect(context.destination);
  }

  function stop(): void {
    processor?.disconnect();
    source?.disconnect();
    stream?.getTracks().forEach((t) => t.stop());
    void context?.close();
    processor = null;
    source = null;
    stream = null;
    context = null;
  }

  return { start, stop };
}

/** Convert Float32 samples [-1, 1] to little-endian Int16 PCM. */
function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// ============================================================================
// BONUS: Twilio Media Stream bridge — real phone calls into the same agent.
// ============================================================================
//
// This file is NOT wired into the main Worker. It is a reference adapter that
// shows how the *exact same* session pipeline (Flux -> Llama -> Aura) powers a
// real phone call instead of a browser.
//
// The only thing that changes is the transport and the audio codec:
//
//   Browser demo:   mic  -> 16kHz linear16 PCM        -> WebSocket -> Worker
//   Phone call:     PSTN -> Twilio -> 8kHz mu-law     -> WebSocket -> Worker
//
// Twilio streams audio as base64 mu-law (G.711) at 8kHz. We up-sample/convert
// to the 16kHz linear16 PCM that Flux and smart-turn expect, run the identical
// session logic, then convert Aura's audio back to mu-law for Twilio playback.
//
// To use this in production:
//   1. Point a Twilio number's TwiML to <Connect><Stream url="wss://.../twilio"/>
//   2. Route the /twilio path here instead of to the Durable Object directly.
//   3. Reuse VoiceSession, swapping base64ToBytes for muLawToPcm16 on input
//      and pcm/mp3 output for pcm16ToMuLaw on output.
//
// References:
//   Twilio Media Streams: https://www.twilio.com/docs/voice/media-streams
//   Flux model:           https://developers.cloudflare.com/workers-ai/models/flux/

/**
 * Decode 8-bit G.711 mu-law to a 16-bit PCM sample.
 * Standard ITU-T G.711 mu-law expansion.
 */
export function muLawByteToPcm16(muLawByte: number): number {
  const MU_LAW_BIAS = 0x84;
  muLawByte = ~muLawByte & 0xff;
  const sign = muLawByte & 0x80;
  const exponent = (muLawByte >> 4) & 0x07;
  const mantissa = muLawByte & 0x0f;
  let sample = ((mantissa << 3) + MU_LAW_BIAS) << exponent;
  sample -= MU_LAW_BIAS;
  return sign ? -sample : sample;
}

/**
 * Convert a buffer of 8kHz mu-law (from Twilio) into 16kHz linear16 PCM.
 * We decode each mu-law byte and duplicate samples for a naive 8k->16k
 * up-sample (good enough for STT; use a real resampler for production).
 */
export function muLawToPcm16(muLaw: Uint8Array): Uint8Array {
  const out = new Int16Array(muLaw.length * 2); // 2x for up-sample
  for (let i = 0; i < muLaw.length; i++) {
    const sample = muLawByteToPcm16(muLaw[i]);
    out[i * 2] = sample;
    out[i * 2 + 1] = sample;
  }
  return new Uint8Array(out.buffer);
}

/** Encode a single 16-bit PCM sample to G.711 mu-law. */
export function pcm16SampleToMuLaw(sample: number): number {
  const MU_LAW_MAX = 0x1fff;
  const MU_LAW_BIAS = 0x84;
  let sign = (sample >> 8) & 0x80;
  if (sign) sample = -sample;
  if (sample > MU_LAW_MAX) sample = MU_LAW_MAX;
  sample += MU_LAW_BIAS;

  let exponent = 7;
  for (let mask = 0x4000; (sample & mask) === 0 && exponent > 0; mask >>= 1) {
    exponent--;
  }
  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  return ~(sign | (exponent << 4) | mantissa) & 0xff;
}

/**
 * Convert 16kHz linear16 PCM (Aura output, after decoding) down to 8kHz
 * mu-law for Twilio playback. Decimates by 2 for the 16k->8k step.
 */
export function pcm16ToMuLaw(pcm: Int16Array): Uint8Array {
  const out = new Uint8Array(Math.floor(pcm.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = pcm16SampleToMuLaw(pcm[i * 2]);
  }
  return out;
}

/**
 * Shape of a Twilio Media Stream message. Twilio sends `media.payload` as a
 * base64 mu-law chunk; you would feed muLawToPcm16(payload) into VoiceSession.
 */
export interface TwilioMediaMessage {
  event: "connected" | "start" | "media" | "stop";
  media?: { payload: string };
  start?: { streamSid: string; callSid: string };
}

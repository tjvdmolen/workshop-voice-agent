// Small audio/encoding helpers shared by the session.

/** Decode a base64 string into a Uint8Array (browser-sent PCM chunk). */
export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Encode bytes (synthesized audio) into base64 for the client. */
export function bytesToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000; // avoid call-stack limits on large buffers
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Append two Uint8Arrays into a new buffer. */
export function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/** Keep only the trailing N bytes of a buffer (sliding window for smart-turn). */
export function tailBytes(buffer: Uint8Array, maxBytes: number): Uint8Array {
  if (buffer.length <= maxBytes) return buffer;
  return buffer.subarray(buffer.length - maxBytes);
}

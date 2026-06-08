/**
 * Plays back audio chunks (MP3 from Aura) received over the WebSocket.
 *
 * Because the agent streams one sentence at a time, chunks can arrive faster
 * than they play. We queue them and play sequentially so speech stays in
 * order and does not overlap.
 */
export function useAudioPlayback() {
  const queue: string[] = []; // object URLs awaiting playback
  let playing = false;
  let current: HTMLAudioElement | null = null;

  function enqueue(base64: string, mimeType: string): void {
    const url = URL.createObjectURL(base64ToBlob(base64, mimeType));
    queue.push(url);
    if (!playing) void playNext();
  }

  async function playNext(): Promise<void> {
    const url = queue.shift();
    if (!url) {
      playing = false;
      return;
    }
    playing = true;

    const audio = new Audio(url);
    current = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      void playNext();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      void playNext();
    };

    try {
      await audio.play();
    } catch {
      // Autoplay may be blocked until the user interacts; the Start button
      // satisfies that gesture in practice.
      URL.revokeObjectURL(url);
      void playNext();
    }
  }

  function reset(): void {
    queue.length = 0;
    if (current) {
      current.pause();
      current = null;
    }
    playing = false;
  }

  return { enqueue, reset };
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

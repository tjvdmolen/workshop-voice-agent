import { ref } from "vue";
import type { ClientMessage, ServerMessage } from "../types";

/**
 * Thin reactive wrapper around the WebSocket to the Worker.
 * Exposes connection status and a typed send(); delegates inbound messages
 * to a handler supplied by the caller.
 */
export function useWebSocket(onMessage: (msg: ServerMessage) => void) {
  const connected = ref(false);
  let ws: WebSocket | null = null;

  function connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Same-origin: works both behind `wrangler dev` and when deployed.
      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${location.host}/ws`);

      ws.onopen = () => {
        connected.value = true;
        resolve();
      };
      ws.onclose = () => {
        connected.value = false;
      };
      ws.onerror = (err) => {
        connected.value = false;
        reject(err);
      };
      ws.onmessage = (event) => {
        try {
          onMessage(JSON.parse(event.data) as ServerMessage);
        } catch {
          // ignore malformed frames
        }
      };
    });
  }

  function send(message: ClientMessage): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  function disconnect(): void {
    send({ type: "stop" });
    ws?.close();
    ws = null;
    connected.value = false;
  }

  return { connected, connect, send, disconnect };
}

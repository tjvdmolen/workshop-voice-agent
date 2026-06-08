import type { Env } from "./types";

// Re-export the Durable Object class so the runtime can instantiate it.
export { VoiceSession } from "./session";

/**
 * Worker entry point.
 *
 * - `GET /ws`  -> upgrade to WebSocket, routed to a per-session Durable Object
 * - everything else -> serve the built Vue client from the ASSETS binding
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected a WebSocket upgrade request.", { status: 426 });
      }

      // One Durable Object per session. A real app would key this by a
      // session/call ID; for the workshop a fresh unique ID per connection
      // keeps each browser tab isolated.
      const id = env.VOICE_SESSION.newUniqueId();
      const stub = env.VOICE_SESSION.get(id);
      return stub.fetch(request);
    }

    // Serve the static SPA (built into client/dist).
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

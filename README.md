# Voice Agent Workshop — Cloudflare Workers AI

Build a low-latency, end-to-end voice AI agent that runs entirely on Cloudflare's
edge GPU infrastructure. Speak into your browser, the agent transcribes, thinks,
and speaks back. Every model runs on Workers AI, so there are no round-trips to
external APIs.

## What it demonstrates

- **Real-time speech-to-text** with `@cf/deepgram/flux` (streaming, WebSocket)
- **Fast LLM inference** with `@cf/meta/llama-3.1-8b-instruct-fast` (and a 70B option)
- **Text-to-speech** with `@cf/deepgram/aura-1` (12 voices)
- **Turn detection** two ways: simple silence timer vs `@cf/pipecat-ai/smart-turn-v2`
- **Live latency breakdown** so you can feel the speed/quality trade-off
- **Streaming pipeline**: the agent starts speaking before the LLM finishes

## Architecture

```
Browser (mic 16kHz PCM)
      | WebSocket /ws
      v
Cloudflare Worker  -->  Durable Object (VoiceSession)
                          |- @cf/deepgram/flux        (streaming STT)
                          |- turn detection           (silence OR smart-turn-v2)
                          |- @cf/meta/llama-3.x        (streaming LLM)
                          |- @cf/deepgram/aura-1       (sentence-by-sentence TTS)
      ^                   |
      | WebSocket /ws     v
Browser (speaker, MP3 chunks)
```

The browser holds a single WebSocket to the Worker. The Worker (inside a Durable
Object that owns the conversation state) opens its own connection to Flux and
calls the LLM and TTS models via the AI binding.

## Prerequisites

- Node.js 18+
- A Cloudflare account with Workers AI enabled
- `wrangler` (installed as a dev dependency)

## Setup

```bash
# 1. Install Worker dependencies
npm install

# 2. Install client dependencies
npm --prefix client install

# 3. Log in to the Cloudflare account you want to deploy to
npx wrangler login

# 4. Build the Vue client (outputs to client/dist, served by the Worker)
npm run client:build

# 5. Run locally
npm run dev
```

Open the printed `localhost` URL, click **Start Conversation**, allow microphone
access, and start talking.

### Local development with hot reload

Run the Worker and the Vite dev server in two terminals:

```bash
# Terminal 1 — Worker on :8787
npm run dev

# Terminal 2 — Vue client on :5173 (proxies /ws to :8787)
npm run client:dev
```

Use the `:5173` URL for live client edits.

## Dev Containers

This repository includes a [Dev Container](https://containers.dev/) configuration
for VS Code and GitHub Codespaces. It pre-installs Node.js, Wrangler, and all
project dependencies so you can start coding immediately without local setup.

### Using VS Code

1. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).
2. Open the project in VS Code and run **Dev Containers: Reopen in Container**.
3. The container will automatically install dependencies and forward ports
   (`5173` for Vite, `8787` for Wrangler).

### Using GitHub Codespaces

Click **Code > Codespaces > Create codespace on main** from the repository page.
The environment will build and start automatically.

### Post-setup

Inside the container, run `wrangler login` to authenticate, then use the same
commands as local development:

```bash
npm run dev        # Worker + assets
npm run client:dev # Hot-reload client only
```

## Deploy

```bash
npm run client:build
npm run deploy
```

`wrangler deploy` publishes to whatever account you authenticated with via
`wrangler login`.

### Shared-account workshops (avoiding name conflicts)

The `deploy` and `tail` scripts append your shell username so each attendee
gets an isolated Worker — `wrangler deploy --name voice-agent-$USER`. This
gives everyone a unique `workers.dev` URL, Durable Object namespace, and log
stream even when deploying to the **same** Cloudflare account, so deploys no
longer overwrite each other.

If `$USER` is unset (e.g. some Windows shells) or two people share a username,
pick your own suffix explicitly:

```bash
npm run client:build
wrangler deploy --name voice-agent-<your-initials>
wrangler tail voice-agent-<your-initials>   # to follow your logs
```

`wrangler dev` runs locally and is never affected — only `deploy` touches the
shared account.

## The config panel (the experiment)

Every control maps to a parameter the Worker uses live:

| Control | Effect |
|---------|--------|
| Turn Detection | Silence timer vs smart-turn-v2 model |
| Silence Threshold | How long a pause counts as "done" (silence mode) |
| Smart-Turn Buffer | Trailing audio window analyzed (smart-turn mode) |
| Turn Probability | Confidence needed to end the turn (smart-turn mode) |
| LLM Model | 8B (fast) vs 70B (smart) |
| Temperature | Determinism vs creativity |
| Max Tokens | Response length (shorter = faster) |
| TTS Voice | One of 12 Aura voices |

Watch the **Latency** panel update per turn to find the config that feels most
natural while staying under the 1-second budget.

## Project structure

```
src/                 Worker backend (TypeScript)
  worker.ts          Entry point: /ws upgrade + static asset serving
  session.ts         Durable Object: full pipeline orchestration
  config.ts          Defaults, validation, medical system prompt
  types.ts           Shared protocol + config types
  utils.ts           base64 / audio buffer helpers
  models/
    flux.ts          Streaming STT
    llama.ts         Streaming LLM
    aura.ts          Sentence-by-sentence TTS
    smart-turn.ts    Turn detection
  twilio-bridge.ts   BONUS: phone-call adapter (mu-law <-> PCM)

client/              Vue 3 + Vite frontend
  src/
    App.vue
    components/      ConfigPanel, LatencyDisplay
    composables/     useWebSocket, useAudioCapture, useAudioPlayback

docs/
  FACILITATOR_GUIDE.md
```

## From browser to phone calls

`src/twilio-bridge.ts` shows how the same pipeline serves real phone calls. The
only differences are the transport (Twilio Media Streams WebSocket) and the
codec (8kHz mu-law instead of 16kHz PCM). The session logic is unchanged.

## Notes and limitations

- This is workshop/demo code, optimized for clarity over production hardening.
- `ScriptProcessorNode` is used for mic capture for simplicity; migrate to
  `AudioWorklet` for production.
- TTS streams sentence-by-sentence via the binding. For token-level streaming,
  Aura also supports a persistent WebSocket (`type: "Speak"` / `type: "Flush"`).
- No persistence, auth, or rate limiting is included.

## Model reference

- Flux: https://developers.cloudflare.com/workers-ai/models/flux/
- Aura: https://developers.cloudflare.com/workers-ai/models/aura-1/
- smart-turn-v2: https://developers.cloudflare.com/workers-ai/models/smart-turn-v2/
- Llama 3.1 8B fast: https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fast/

# Facilitator Guide — Voice Agent Workshop

A 2-hour, hands-on workshop for a technical audience. The customer is in the
medical field; their core concern is **conversational latency** ("can it feel
natural, or are the delays too long?"). Keep coming back to that thread.

## Before the session

- [ ] Deploy a working copy to your own account so you have a reliable demo URL.
- [ ] Confirm Workers AI is enabled on the account attendees will use.
- [ ] Test your microphone and audio output in the room.
- [ ] Have the repo URL ready to share.
- [ ] Pre-run `npm install` and `npm --prefix client install` so the first
      hands-on segment is not bottlenecked on downloads.
- [ ] Open the latency panel and warm up the models with a few turns (first
      inference can be slower).

## Timing overview (2 hours)

| Time | Segment | Format |
|------|---------|--------|
| 0:00 | Why edge AI for voice | Presentation |
| 0:15 | Live demo | Demo |
| 0:25 | Architecture deep dive | Presentation |
| 0:40 | Hands-On 1: deploy the Worker | Guided |
| 1:00 | Hands-On 2: mic + Flux STT | Guided |
| 1:25 | Break | |
| 1:35 | Hands-On 3: LLM + Aura TTS | Guided |
| 2:00 | Hands-On 4: the experiment | Guided |
| 2:15 | Q&A + Twilio preview | Discussion |

---

## 0:00 — Why edge AI for voice (15 min)

Talking points:

- Traditional voice stacks chain together services in different clouds/regions:
  mic -> STT API -> your backend -> LLM API -> TTS API -> back to caller. Each
  hop adds network latency that compounds into awkward pauses.
- Cloudflare runs STT, the LLM, and TTS on the **same edge GPUs**, close to the
  user. Fewer hops, lower and more predictable latency.
- For a clinic phone line, sub-second responses are the difference between a
  natural conversation and one where callers talk over the agent.

Set the goal: "By the end, you will have built this and tuned it to feel natural."

## 0:15 — Live demo (10 min)

1. Start the deployed agent. Speak a simple intake line: "Hi, I've had a sore
   throat for three days."
2. Point at the **latency panel** as the agent responds. Call out the total.
3. Toggle to **Smart Turn** mode. Repeat. Note the slightly higher latency and
   why (an extra inference call that understands natural end-of-turn).
4. Change the **TTS voice** mid-conversation to show live config.

The "wow": all of this is one Worker, no external AI vendors.

## 0:25 — Architecture deep dive (15 min)

Walk the diagram in the README. Emphasize:

- One WebSocket from the browser; the Worker fans out to the models.
- The **Durable Object** holds conversation state (transcript, history, config,
  audio buffer) for one call.
- **Streaming pipeline**: as soon as the LLM emits a full sentence, that sentence
  is synthesized and streamed back. The agent starts talking before it has
  finished "thinking" — the biggest perceived-latency win.

## 0:40 — Hands-On 1: deploy the Worker (20 min)

Have attendees:

```bash
git clone <repo-url> && cd voice-agent-workshop
npm install
npm --prefix client install
npx wrangler login
npm run client:build
npm run dev
```

Checkpoint: everyone sees the UI and a "Connected" status after clicking Start.
Expect questions about Workers AI access — have a backup account ready.

> **Shared-account note:** `npm run dev` runs locally and never collides. When
> attendees later run `npm run deploy`, the script auto-appends their username
> (`wrangler deploy --name voice-agent-$USER`) so parallel deploys to the same
> account don't overwrite each other. If usernames clash, have them pass
> `--name voice-agent-<initials>` explicitly. See the README "Shared-account
> workshops" section.

## 1:00 — Hands-On 2: mic + Flux STT (25 min)

Focus on `src/models/flux.ts` and `client/src/composables/useAudioCapture.ts`.

- Explain the audio format requirement: 16kHz mono linear16 PCM.
- Show how `env.AI.run("@cf/deepgram/flux", ..., { websocket: true })` returns a
  WebSocket the Worker streams audio into.
- Checkpoint: attendees speak and see their words appear as live transcripts.

Common issues:
- No transcript -> mic permissions blocked, or sample rate mismatch.
- Garbled transcript -> usually a PCM conversion bug; compare to the provided code.

## 1:25 — Break (10 min)

## 1:35 — Hands-On 3: LLM + Aura TTS (25 min)

Focus on `src/models/llama.ts`, `src/models/aura.ts`, and `src/session.ts`.

- Show the streaming LLM loop and how sentences are flushed to TTS as they form.
- Point out the medical system prompt in `src/config.ts`.
- Checkpoint: attendees complete the loop and hear the agent speak back.

## 2:00 — Hands-On 4: the experiment (15 min)

Pose the challenge:

> "Your clinic call center needs responses that feel instant. Find the config
> that feels most natural while keeping total latency under ~1 second. You have
> 15 minutes. Report your winning config."

Encourage them to:
- Compare Silence vs Smart Turn latency.
- Lower Max Tokens and watch total latency drop.
- Switch 8B vs 70B and judge quality vs speed.
- Try different silence thresholds for interruption feel.

Have a few attendees share their winning config and reasoning.

## 2:15 — Q&A + Twilio preview (15 min)

- Open `src/twilio-bridge.ts`. Explain that real phone calls are the same
  pipeline with a different transport (Twilio Media Streams) and codec (mu-law).
- Likely questions:
  - **HIPAA / compliance**: This is demo code. Note where you'd add auth,
    logging controls, and data handling. Defer specifics to a follow-up.
  - **Knowledge base**: mention adding RAG (Vectorize + a retrieval step before
    the LLM) for clinic-specific answers.
  - **Pricing**: refer to per-model unit pricing on the model pages; for
    commercials, hand off to the account team.

## Key messages to land

1. Lower latency comes from co-locating STT, LLM, and TTS on the edge.
2. The platform gives you a real trade-off dial (silence vs smart-turn, 8B vs 70B).
3. The same code that runs the browser demo runs real phone calls.

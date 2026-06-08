<script setup lang="ts">
import { reactive, ref } from "vue";
import ConfigPanel from "./components/ConfigPanel.vue";
import LatencyDisplay from "./components/LatencyDisplay.vue";
import { useWebSocket } from "./composables/useWebSocket";
import { useAudioCapture } from "./composables/useAudioCapture";
import { useAudioPlayback } from "./composables/useAudioPlayback";
import type { LatencyComponent, ServerMessage, SessionConfig } from "./types";

// Default config mirrors the Worker's DEFAULT_CONFIG.
const config = ref<SessionConfig>({
  turnDetection: "silence",
  silenceThresholdMs: 1500,
  smartTurnBufferSec: 2,
  turnProbabilityThreshold: 0.7,
  llmModel: "@cf/meta/llama-3.1-8b-instruct-fast",
  llmTemperature: 0.6,
  llmMaxTokens: 150,
  ttsVoice: "asteria",
});

const latencies = reactive<Record<LatencyComponent, number>>({
  stt: 0,
  turn: 0,
  llm: 0,
  tts: 0,
  total: 0,
});

const active = ref(false);
const turnCount = ref(0);
const userTranscript = ref("");
const agentText = ref("");
const errorMsg = ref("");

const playback = useAudioPlayback();
const capture = useAudioCapture();

const { connected, connect, send, disconnect } = useWebSocket(handleServerMessage);

function handleServerMessage(msg: ServerMessage) {
  switch (msg.type) {
    case "ready":
      config.value = msg.config;
      break;
    case "transcript":
      // Live partials replace; finals append.
      userTranscript.value = msg.isPartial
        ? userTranscript.value.replace(/\s*\[.*\]$/, "") + ` [${msg.text}]`
        : userTranscript.value.replace(/\s*\[.*\]$/, "") + ` ${msg.text}`;
      break;
    case "turn-detected":
      turnCount.value++;
      agentText.value = "";
      // Reset per-turn latency view.
      latencies.stt = latencies.turn = latencies.llm = latencies.tts = latencies.total = 0;
      break;
    case "agent-text":
      if (msg.isPartial) agentText.value += msg.text;
      break;
    case "audio":
      playback.enqueue(msg.data, msg.mimeType);
      break;
    case "latency":
      latencies[msg.component] = msg.ms;
      break;
    case "error":
      errorMsg.value = msg.message;
      break;
  }
}

async function startConversation() {
  errorMsg.value = "";
  try {
    await connect();
    // Push the current config to the Worker before streaming audio.
    send({ type: "config", config: config.value });
    await capture.start((base64Pcm) => send({ type: "audio", data: base64Pcm }));
    active.value = true;
  } catch (err) {
    errorMsg.value = `Could not start: ${String(err)}`;
  }
}

function stopConversation() {
  capture.stop();
  playback.reset();
  disconnect();
  active.value = false;
}

// When config changes mid-session, push it live to the Worker.
function onConfigChange(next: SessionConfig) {
  config.value = next;
  if (connected.value) send({ type: "config", config: next });
}
</script>

<template>
  <div class="app">
    <header>
      <h1>Voice Agent Workshop</h1>
      <p class="subtitle">Cloudflare Workers AI — Flux STT · Llama · Aura TTS · smart-turn-v2</p>
    </header>

    <div class="grid">
      <!-- Left: configuration -->
      <ConfigPanel
        :model-value="config"
        :disabled="false"
        @update:model-value="onConfigChange"
      />

      <!-- Center: conversation + controls -->
      <section class="panel conversation">
        <h2>Conversation</h2>

        <div class="controls">
          <button v-if="!active" class="primary" @click="startConversation">
            Start Conversation
          </button>
          <button v-else class="danger" @click="stopConversation">Stop</button>
          <span class="status" :class="{ on: connected }">
            {{ connected ? "Connected" : "Disconnected" }}
          </span>
        </div>

        <div class="bubble user">
          <span class="who">You</span>
          <p>{{ userTranscript || "..." }}</p>
        </div>
        <div class="bubble agent">
          <span class="who">Agent</span>
          <p>{{ agentText || "..." }}</p>
        </div>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      </section>

      <!-- Right: latency -->
      <LatencyDisplay
        :latencies="latencies"
        :turn-mode="config.turnDetection"
        :turn-count="turnCount"
      />
    </div>
  </div>
</template>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 20px;
}
header {
  margin-bottom: 24px;
}
h1 {
  margin: 0;
  font-size: 28px;
}
.subtitle {
  margin: 4px 0 0;
  color: #8a8aa3;
  font-size: 14px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 20px;
  align-items: start;
}
.panel {
  background: #1a1a2e;
  border: 1px solid #2d2d44;
  border-radius: 12px;
  padding: 20px;
}
h2 {
  margin: 0 0 16px;
  font-size: 18px;
}
.controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
button {
  padding: 12px 20px;
  border-radius: 8px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.primary {
  background: #f6821f;
  color: #1a1a2e;
}
.danger {
  background: #ff5c5c;
  color: #fff;
}
.status {
  font-size: 13px;
  color: #ff5c5c;
}
.status.on {
  color: #2ecc71;
}
.bubble {
  background: #0f0f1e;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 12px;
}
.who {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #8a8aa3;
}
.bubble p {
  margin: 6px 0 0;
  line-height: 1.5;
}
.bubble.agent {
  border-left: 3px solid #f6821f;
}
.error {
  color: #ff5c5c;
  font-size: 14px;
  margin-top: 12px;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>

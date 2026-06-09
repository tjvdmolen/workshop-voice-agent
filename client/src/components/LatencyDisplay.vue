<script setup lang="ts">
import { computed } from "vue";
import type { LatencyComponent, TurnDetectionMode, SttModel, TtsModel } from "../types";

const props = defineProps<{
  latencies: Record<LatencyComponent, number>;
  turnMode: TurnDetectionMode;
  turnCount: number;
  sttModel: SttModel;
  ttsModel: TtsModel;
}>();

const TARGET_MS = 1000; // conversational "feels instant" budget

const sttLabel = computed(() => {
  return props.sttModel === "@cf/deepgram/flux" ? "STT (Flux)" : "STT (Nova-3)";
});

const ttsLabel = computed(() => {
  switch (props.ttsModel) {
    case "@cf/myshell-ai/melotts":
      return "TTS (MeloTTS)";
    case "@cf/deepgram/aura-2-en":
      return "TTS (Aura-2 EN)";
    case "@cf/deepgram/aura-2-es":
      return "TTS (Aura-2 ES)";
    default:
      return "TTS (Aura-1)";
  }
});

const rows = computed(() => [
  { key: "stt" as const, label: sttLabel.value },
  { key: "turn" as const, label: "Turn Detect" },
  { key: "llm" as const, label: "LLM" },
  { key: "tts" as const, label: ttsLabel.value },
]);

const totalPct = computed(() =>
  Math.min(100, Math.round((props.latencies.total / TARGET_MS) * 100)),
);

const overBudget = computed(() => props.latencies.total > TARGET_MS);
</script>

<template>
  <section class="panel">
    <h2>Latency — Turn #{{ turnCount }}</h2>
    <p class="hint">Mode: {{ turnMode === "silence" ? "Silence" : "Smart Turn" }}</p>

    <div class="row" v-for="row in rows" :key="row.key">
      <span class="label">{{ row.label }}</span>
      <span class="value">{{ latencies[row.key] || 0 }} ms</span>
    </div>

    <div class="row total">
      <span class="label">TOTAL</span>
      <span class="value" :class="{ over: overBudget }">{{ latencies.total || 0 }} ms</span>
    </div>

    <div class="bar">
      <div class="fill" :class="{ over: overBudget }" :style="{ width: totalPct + '%' }"></div>
    </div>
    <p class="budget">{{ totalPct }}% of {{ TARGET_MS }}ms target</p>
  </section>
</template>

<style scoped>
.panel {
  background: #1a1a2e;
  border: 1px solid #2d2d44;
  border-radius: 12px;
  padding: 20px;
}
h2 {
  margin: 0 0 4px;
  font-size: 18px;
}
.hint {
  margin: 0 0 16px;
  font-size: 13px;
  color: #8a8aa3;
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  color: #c5c5d8;
}
.row.total {
  border-top: 1px solid #2d2d44;
  margin-top: 6px;
  padding-top: 10px;
  font-weight: 600;
  color: #fff;
}
.value {
  font-variant-numeric: tabular-nums;
}
.value.over {
  color: #ff5c5c;
}
.bar {
  margin-top: 12px;
  height: 10px;
  border-radius: 5px;
  background: #0f0f1e;
  overflow: hidden;
}
.fill {
  height: 100%;
  background: #2ecc71;
  transition: width 0.3s ease;
}
.fill.over {
  background: #ff5c5c;
}
.budget {
  margin: 8px 0 0;
  font-size: 12px;
  color: #8a8aa3;
}
</style>

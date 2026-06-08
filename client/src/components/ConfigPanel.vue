<script setup lang="ts">
import { computed } from "vue";
import {
  type SessionConfig,
  type LlmModel,
  type TtsVoice,
  type TurnDetectionMode,
  TTS_VOICES,
  LLM_MODELS,
} from "../types";

const props = defineProps<{
  modelValue: SessionConfig;
  disabled: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [config: SessionConfig];
}>();

// Helper to patch one field and emit the merged config.
function update<K extends keyof SessionConfig>(key: K, value: SessionConfig[K]) {
  emit("update:modelValue", { ...props.modelValue, [key]: value });
}

const isSmartTurn = computed(() => props.modelValue.turnDetection === "smart-turn");
</script>

<template>
  <section class="panel">
    <h2>Configuration</h2>
    <p class="hint">Tweak these live and feel the latency vs. naturalness trade-off.</p>

    <!-- Turn detection mode -->
    <div class="field">
      <label>Turn Detection</label>
      <div class="segmented">
        <button
          :class="{ active: modelValue.turnDetection === 'silence' }"
          :disabled="disabled"
          @click="update('turnDetection', 'silence' as TurnDetectionMode)"
        >
          Silence
        </button>
        <button
          :class="{ active: isSmartTurn }"
          :disabled="disabled"
          @click="update('turnDetection', 'smart-turn' as TurnDetectionMode)"
        >
          Smart Turn
        </button>
      </div>
    </div>

    <!-- Silence threshold (silence mode) -->
    <div class="field" v-if="!isSmartTurn">
      <label>Silence Threshold: {{ modelValue.silenceThresholdMs }} ms</label>
      <input
        type="range"
        min="500"
        max="3000"
        step="100"
        :value="modelValue.silenceThresholdMs"
        :disabled="disabled"
        @input="update('silenceThresholdMs', Number(($event.target as HTMLInputElement).value))"
      />
    </div>

    <!-- Smart-turn params (smart-turn mode) -->
    <template v-if="isSmartTurn">
      <div class="field">
        <label>Smart-Turn Buffer: {{ modelValue.smartTurnBufferSec }} s</label>
        <input
          type="range"
          min="1"
          max="3"
          step="0.5"
          :value="modelValue.smartTurnBufferSec"
          :disabled="disabled"
          @input="update('smartTurnBufferSec', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="field">
        <label>Turn Probability: {{ modelValue.turnProbabilityThreshold }}</label>
        <input
          type="range"
          min="0.5"
          max="0.9"
          step="0.05"
          :value="modelValue.turnProbabilityThreshold"
          :disabled="disabled"
          @input="update('turnProbabilityThreshold', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
    </template>

    <!-- LLM model -->
    <div class="field">
      <label>LLM Model</label>
      <select
        :value="modelValue.llmModel"
        :disabled="disabled"
        @change="update('llmModel', ($event.target as HTMLSelectElement).value as LlmModel)"
      >
        <option v-for="m in LLM_MODELS" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
    </div>

    <!-- LLM temperature -->
    <div class="field">
      <label>Temperature: {{ modelValue.llmTemperature }}</label>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        :value="modelValue.llmTemperature"
        :disabled="disabled"
        @input="update('llmTemperature', Number(($event.target as HTMLInputElement).value))"
      />
    </div>

    <!-- LLM max tokens -->
    <div class="field">
      <label>Max Tokens: {{ modelValue.llmMaxTokens }}</label>
      <input
        type="range"
        min="50"
        max="512"
        step="10"
        :value="modelValue.llmMaxTokens"
        :disabled="disabled"
        @input="update('llmMaxTokens', Number(($event.target as HTMLInputElement).value))"
      />
    </div>

    <!-- TTS voice -->
    <div class="field">
      <label>TTS Voice</label>
      <select
        :value="modelValue.ttsVoice"
        :disabled="disabled"
        @change="update('ttsVoice', ($event.target as HTMLSelectElement).value as TtsVoice)"
      >
        <option v-for="v in TTS_VOICES" :key="v" :value="v">{{ v }}</option>
      </select>
    </div>
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
.field {
  margin-bottom: 16px;
}
label {
  display: block;
  font-size: 13px;
  margin-bottom: 6px;
  color: #c5c5d8;
}
input[type="range"] {
  width: 100%;
  accent-color: #f6821f;
}
select {
  width: 100%;
  padding: 8px;
  border-radius: 6px;
  background: #0f0f1e;
  color: #fff;
  border: 1px solid #2d2d44;
}
.segmented {
  display: flex;
  gap: 8px;
}
.segmented button {
  flex: 1;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #2d2d44;
  background: #0f0f1e;
  color: #c5c5d8;
  cursor: pointer;
}
.segmented button.active {
  background: #f6821f;
  color: #1a1a2e;
  border-color: #f6821f;
  font-weight: 600;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

<script setup lang="ts">
import { computed } from "vue";
import {
  type SessionConfig,
  type LlmModel,
  type TtsVoice,
  type TurnDetectionMode,
  type SttModel,
  type TtsModel,
  type SttLanguage,
  AURA_1_VOICES,
  AURA_2_EN_VOICES,
  AURA_2_ES_VOICES,
  MELOTTs_VOICES,
  LLM_MODELS,
  TTS_MODELS,
  LANGUAGES,
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
const isMeloTts = computed(() => props.modelValue.ttsModel === "@cf/myshell-ai/melotts");

const availableVoices = computed<TtsVoice[]>(() => {
  switch (props.modelValue.ttsModel) {
    case "@cf/deepgram/aura-1":
      return AURA_1_VOICES;
    case "@cf/deepgram/aura-2-en":
      return AURA_2_EN_VOICES;
    case "@cf/deepgram/aura-2-es":
      return AURA_2_ES_VOICES;
    case "@cf/myshell-ai/melotts":
      return MELOTTs_VOICES;
    default:
      return AURA_1_VOICES;
  }
});

function onTtsModelChange(model: TtsModel) {
  // Pick the first valid voice for the new model
  let defaultVoice: TtsVoice;
  switch (model) {
    case "@cf/deepgram/aura-1":
      defaultVoice = "asteria";
      break;
    case "@cf/deepgram/aura-2-en":
      defaultVoice = "luna";
      break;
    case "@cf/deepgram/aura-2-es":
      defaultVoice = "aquila";
      break;
    case "@cf/myshell-ai/melotts":
      defaultVoice = "default";
      break;
    default:
      defaultVoice = "asteria";
  }
  emit("update:modelValue", { ...props.modelValue, ttsModel: model, ttsVoice: defaultVoice });
}
</script>

<template>
  <section class="panel">
    <h2>Configuration</h2>
    <p class="hint">Tweak these live and feel the latency vs. naturalness trade-off.</p>

    <!-- STT Model -->
    <div class="field">
      <label>Speech-to-Text Model</label>
      <div class="segmented">
        <button
          :class="{ active: modelValue.sttModel === '@cf/deepgram/nova-3' }"
          :disabled="disabled"
          @click="update('sttModel', '@cf/deepgram/nova-3' as SttModel)"
        >
          Nova-3
        </button>
        <button
          :class="{ active: modelValue.sttModel === '@cf/deepgram/flux' }"
          :disabled="disabled"
          @click="update('sttModel', '@cf/deepgram/flux' as SttModel)"
        >
          Flux
        </button>
      </div>
    </div>

    <!-- Language -->
    <div class="field">
      <label>Language</label>
      <select
        :value="modelValue.language"
        :disabled="disabled"
        @change="update('language', ($event.target as HTMLSelectElement).value as SttLanguage)"
      >
        <option v-for="lang in LANGUAGES" :key="lang.value" :value="lang.value">{{ lang.label }}</option>
      </select>
    </div>

    <!-- TTS Model -->
    <div class="field">
      <label>Text-to-Speech Model</label>
      <div class="segmented">
        <button
          :class="{ active: modelValue.ttsModel === '@cf/deepgram/aura-1' }"
          :disabled="disabled"
          @click="onTtsModelChange('@cf/deepgram/aura-1')"
        >
          Aura-1
        </button>
        <button
          :class="{ active: modelValue.ttsModel === '@cf/deepgram/aura-2-en' }"
          :disabled="disabled"
          @click="onTtsModelChange('@cf/deepgram/aura-2-en')"
        >
          Aura-2 EN
        </button>
        <button
          :class="{ active: modelValue.ttsModel === '@cf/deepgram/aura-2-es' }"
          :disabled="disabled"
          @click="onTtsModelChange('@cf/deepgram/aura-2-es')"
        >
          Aura-2 ES
        </button>
        <button
          :class="{ active: modelValue.ttsModel === '@cf/myshell-ai/melotts' }"
          :disabled="disabled"
          @click="onTtsModelChange('@cf/myshell-ai/melotts')"
        >
          MeloTTS
        </button>
      </div>
    </div>

    <!-- TTS Language (MeloTTS only) -->
    <div class="field" v-if="isMeloTts">
      <label>TTS Language</label>
      <select
        :value="modelValue.ttsLanguage"
        :disabled="disabled"
        @change="update('ttsLanguage', ($event.target as HTMLSelectElement).value as SttLanguage)"
      >
        <option v-for="lang in LANGUAGES" :key="lang.value" :value="lang.value">{{ lang.label }}</option>
      </select>
    </div>

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
    <div class="field" v-if="!isMeloTts">
      <label>TTS Voice</label>
      <select
        :value="modelValue.ttsVoice"
        :disabled="disabled"
        @change="update('ttsVoice', ($event.target as HTMLSelectElement).value as TtsVoice)"
      >
        <option v-for="v in availableVoices" :key="v" :value="v">{{ v }}</option>
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

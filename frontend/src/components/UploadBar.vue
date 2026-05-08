<template>
  <div v-if="enabled && uploadStore.active" class="upload-console">
    <div class="upload-bar">
      <div class="upload-bar__inner" :style="{ width: `${uploadStore.percent}%` }"></div>
    </div>

    <section class="upload-console__surface">
      <div class="upload-console__header">
        <div class="upload-console__summary">
          <strong class="upload-console__title">上传任务</strong>
          <span class="upload-console__percent">{{ uploadStore.percent }}%</span>
        </div>
        <div class="upload-console__actions">
          <button class="upload-console__button" type="button" data-testid="upload-toggle" @click="expanded = !expanded">
            {{ expanded ? "收起" : "展开" }}
          </button>
          <button class="upload-console__button upload-console__button--danger" type="button" data-testid="upload-abort" @click="uploadStore.abort">
            中止
          </button>
        </div>
      </div>

      <UploadPanel
        v-if="expanded"
        :percent="uploadStore.percent"
        :total-bytes="uploadStore.totalBytes"
        :sent-bytes="uploadStore.sentBytes"
        :items="uploadStore.items"
        :speed-bytes-per-second="uploadStore.speedBytesPerSecond"
        :eta-seconds="uploadStore.etaSeconds"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import UploadPanel from "@/components/UploadPanel.vue";
import { useUploadStore } from "@/stores/upload";

withDefaults(defineProps<{
  enabled?: boolean;
}>(), {
  enabled: true,
});

const uploadStore = useUploadStore();
const expanded = ref(true);

watch(
  () => uploadStore.active,
  (active) => {
    if (active) {
      expanded.value = true;
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.upload-console {
  position: fixed;
  inset: 0 auto auto 0;
  width: 100%;
  pointer-events: none;
  z-index: 40;
}

.upload-bar {
  width: 100%;
  height: 4px;
  background: var(--border-soft);
}

.upload-bar__inner {
  height: 100%;
  background: linear-gradient(90deg, #0f62fe, #0f766e);
  transition: width 0.15s ease;
}

.upload-console__surface {
  width: min(420px, calc(100vw - 24px));
  margin: 16px 16px 0 auto;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: var(--bg-surface);
  box-shadow: var(--shadow-strong);
  pointer-events: auto;
  overflow: hidden;
}

.upload-console__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-soft);
}

.upload-console__summary,
.upload-console__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.upload-console__summary {
  min-width: 0;
}

.upload-console__title {
  font-size: 14px;
}

.upload-console__percent {
  color: var(--text-secondary);
  font-size: 13px;
}

.upload-console__button {
  border: 1px solid var(--border-soft);
  border-radius: 6px;
  background: var(--control-bg);
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1;
  padding: 8px 10px;
  cursor: pointer;
}

.upload-console__button--danger {
  color: var(--danger);
}
</style>

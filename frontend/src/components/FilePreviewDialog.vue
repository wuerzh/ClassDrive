<template>
  <div
    v-if="item"
    class="preview-dialog-backdrop"
    :class="{ 'preview-dialog-backdrop--maximized': isMaximized }"
    data-testid="file-preview-dialog"
    @click.self="$emit('close')"
  >
    <section
      class="preview-dialog"
      :class="{ 'preview-dialog--maximized': isMaximized }"
      data-testid="file-preview-surface"
    >
      <header class="preview-dialog__header">
        <div>
          <div class="preview-dialog__eyebrow">文件预览</div>
          <h3 class="preview-dialog__title">{{ item.name }}</h3>
        </div>
        <div class="preview-dialog__actions">
          <button
            class="button button--ghost preview-dialog__nav-button"
            type="button"
            data-testid="file-preview-previous"
            :disabled="!hasPrevious"
            @click="$emit('previous')"
          >
            上一个文件
          </button>
          <button
            class="button button--ghost preview-dialog__nav-button"
            type="button"
            data-testid="file-preview-next"
            :disabled="!hasNext"
            @click="$emit('next')"
          >
            下一个文件
          </button>
          <button
            v-if="canEdit"
            class="button button--primary"
            type="button"
            data-testid="file-preview-edit"
            @click="$emit('edit')"
          >
            编辑
          </button>
          <button
            class="button button--ghost preview-dialog__maximize-button"
            type="button"
            data-testid="file-preview-maximize"
            :aria-pressed="isMaximized"
            @click="toggleMaximized"
          >
            {{ isMaximized ? "还原" : "最大化" }}
          </button>
          <button class="button button--ghost" type="button" data-testid="file-preview-close" @click="$emit('close')">关闭</button>
        </div>
      </header>

      <div class="preview-dialog__body" :class="{ 'preview-dialog__body--image': kind === 'image' }">
        <p v-if="loading" class="muted">正在加载预览...</p>
        <p v-else-if="errorText" class="form-error" data-testid="file-preview-error">{{ errorText }}</p>
        <img v-else-if="kind === 'image'" class="preview-dialog__image" data-testid="file-preview-image" :src="item.previewUrl" :alt="item.name" />
        <iframe
          v-else-if="kind === 'pdf'"
          class="preview-dialog__frame"
          data-testid="file-preview-pdf"
          :src="item.previewUrl"
          title="PDF 预览"
        ></iframe>
        <audio v-else-if="kind === 'audio'" class="preview-dialog__media" data-testid="file-preview-audio" controls :src="item.previewUrl"></audio>
        <video v-else-if="kind === 'video'" class="preview-dialog__media preview-dialog__video" data-testid="file-preview-video" controls :src="item.previewUrl"></video>
        <pre v-else-if="kind === 'text'" class="preview-dialog__text" data-testid="file-preview-text">{{ textContent }}</pre>
        <div v-else class="preview-dialog__unsupported" data-testid="file-preview-external">
          <p>该文件不支持预览，可下载后查看。</p>
          <a class="button button--primary" :href="item.downloadUrl" target="_blank" rel="noreferrer">下载文件</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { FilePreviewKind } from "@/utils/file-preview";

interface PreviewDialogItem {
  id: number;
  name: string;
  kind: "file" | "dir";
  previewUrl: string;
  downloadUrl: string;
  mimeType?: string;
}

const props = withDefaults(defineProps<{
  item: PreviewDialogItem | null;
  kind: FilePreviewKind | null;
  loading: boolean;
  errorText: string;
  textContent: string;
  canEdit: boolean;
  hasPrevious?: boolean;
  hasNext?: boolean;
}>(), {
  hasPrevious: false,
  hasNext: false,
});

defineEmits<{
  close: [];
  edit: [];
  previous: [];
  next: [];
}>();

const isMaximized = ref(false);

function toggleMaximized(): void {
  isMaximized.value = !isMaximized.value;
}

watch(
  () => props.item,
  (nextItem) => {
    if (!nextItem) {
      isMaximized.value = false;
    }
  }
);
</script>

<style scoped>
.preview-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.66);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 5060;
}

.preview-dialog-backdrop--maximized {
  align-items: stretch;
  justify-content: stretch;
  padding: 10px;
}

.preview-dialog {
  width: min(980px, 100%);
  max-height: calc(100vh - 48px);
  background: var(--modal-surface);
  border: 1px solid var(--border-soft);
  border-radius: 18px;
  box-shadow: var(--shadow-strong);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-dialog--maximized {
  width: 100%;
  height: calc(100vh - 20px);
  max-height: none;
  border-radius: 10px;
}

.preview-dialog__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-soft);
  background: var(--modal-surface);
}

.preview-dialog__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-dialog__nav-button {
  min-height: 34px;
  padding: 6px 10px;
  border-radius: 8px;
}

.preview-dialog__nav-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.preview-dialog__maximize-button {
  min-height: 34px;
  padding: 6px 12px;
  border-radius: 8px;
}

.preview-dialog__eyebrow {
  color: var(--text-muted);
  font-size: 12px;
  margin-bottom: 4px;
}

.preview-dialog__title {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.preview-dialog__body {
  flex: 1;
  min-height: 62vh;
  padding: 20px;
  overflow: auto;
  background: var(--modal-surface);
}

.preview-dialog--maximized .preview-dialog__body {
  min-height: 0;
}

.preview-dialog__body--image {
  display: grid;
  place-items: center;
  overflow: hidden;
}

.preview-dialog__image {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: calc(100vh - 180px);
  object-fit: contain;
  object-position: center;
}

.preview-dialog--maximized .preview-dialog__image {
  max-height: calc(100vh - 106px);
}

.preview-dialog__frame,
.preview-dialog__video {
  width: 100%;
}

.preview-dialog__frame {
  min-height: 70vh;
  border: 0;
}

.preview-dialog--maximized .preview-dialog__frame,
.preview-dialog--maximized .preview-dialog__video {
  height: 100%;
  min-height: 0;
}

.preview-dialog__media {
  width: 100%;
}

.preview-dialog__text {
  margin: 0;
  min-height: 62vh;
  border: 1px solid var(--control-border);
  border-radius: 8px;
  padding: 14px 16px;
  background: var(--control-bg);
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: Consolas, "Courier New", monospace;
  font-size: 13px;
  line-height: 1.6;
}

.preview-dialog--maximized .preview-dialog__text {
  min-height: 100%;
}

:global(:root.dark .preview-dialog-backdrop) {
  background: rgba(2, 6, 23, 0.78);
}

:global(:root.dark .preview-dialog) {
  border-color: rgba(125, 211, 252, 0.2);
}

.preview-dialog__unsupported {
  min-height: 42vh;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 14px;
  color: var(--text-secondary);
  text-align: center;
}

.preview-dialog__unsupported p {
  margin: 0;
}
</style>

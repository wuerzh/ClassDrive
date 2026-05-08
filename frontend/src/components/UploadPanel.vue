<template>
  <div class="upload-panel" data-testid="upload-panel">
    <div class="upload-panel__stats">
      <div class="upload-panel__stat">
        <span class="upload-panel__label">总进度</span>
        <strong data-testid="upload-total-progress">{{ percent }}%</strong>
      </div>
      <div class="upload-panel__stat">
        <span class="upload-panel__label">速度</span>
        <strong data-testid="upload-speed">{{ formatSpeed(speedBytesPerSecond) }}</strong>
      </div>
      <div class="upload-panel__stat">
        <span class="upload-panel__label">剩余时间</span>
        <strong data-testid="upload-eta">{{ formatEta(etaSeconds) }}</strong>
      </div>
    </div>

    <div class="upload-panel__progress">
      <div class="upload-panel__track">
        <div class="upload-panel__fill" :style="{ width: `${percent}%` }"></div>
      </div>
      <span class="upload-panel__bytes">{{ formatBytes(sentBytes) }} / {{ formatBytes(totalBytes) }}</span>
    </div>

    <ul v-if="items.length" class="upload-panel__list">
      <li v-for="item in items" :key="item.id" class="upload-panel__item">
        <div class="upload-panel__item-header">
          <span class="upload-panel__item-name">{{ item.relativePath || item.name }}</span>
          <span class="upload-panel__item-status">{{ statusText(item.status) }}</span>
        </div>
        <div class="upload-panel__item-meta">
          <span :data-testid="`upload-item-progress-${item.id}`">{{ itemPercent(item) }}%</span>
          <span>{{ formatBytes(item.sentBytes) }} / {{ formatBytes(item.totalBytes) }}</span>
        </div>
        <div class="upload-panel__item-track">
          <div class="upload-panel__item-fill" :style="{ width: `${itemPercent(item)}%` }"></div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { UploadItemState } from "@/stores/upload";

defineProps<{
  percent: number;
  totalBytes: number;
  sentBytes: number;
  items: UploadItemState[];
  speedBytesPerSecond: number;
  etaSeconds: number | null;
}>();

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatSpeed(bytesPerSecond: number) {
  if (bytesPerSecond <= 0) {
    return "--";
  }
  return `${formatBytes(bytesPerSecond)}/s`;
}

function formatEta(seconds: number | null) {
  if (seconds === null) {
    return "--";
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function itemPercent(item: UploadItemState) {
  if (item.totalBytes <= 0) {
    return item.status === "done" ? 100 : 0;
  }
  return Math.min(100, Math.round((item.sentBytes / item.totalBytes) * 100));
}

function statusText(status: UploadItemState["status"]) {
  switch (status) {
    case "done":
      return "已完成";
    case "failed":
      return "失败";
    case "aborted":
      return "已中止";
    case "uploading":
      return "上传中";
    default:
      return "等待中";
  }
}
</script>

<style scoped>
.upload-panel {
  padding: 14px;
  display: grid;
  gap: 12px;
}

.upload-panel__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.upload-panel__stat {
  display: grid;
  gap: 4px;
}

.upload-panel__label {
  color: var(--text-muted);
  font-size: 12px;
}

.upload-panel__progress {
  display: grid;
  gap: 6px;
}

.upload-panel__track,
.upload-panel__item-track {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--border-soft);
  overflow: hidden;
}

.upload-panel__fill,
.upload-panel__item-fill {
  height: 100%;
  background: linear-gradient(90deg, #0f62fe, #0f766e);
}

.upload-panel__bytes,
.upload-panel__item-meta,
.upload-panel__item-status {
  color: var(--text-muted);
  font-size: 12px;
}

.upload-panel__list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 260px;
  overflow: auto;
}

.upload-panel__item {
  display: grid;
  gap: 6px;
}

.upload-panel__item-header,
.upload-panel__item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.upload-panel__item-name {
  min-width: 0;
  color: var(--text-primary);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

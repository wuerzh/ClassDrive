<template>
  <div class="pagination-controls">
    <div class="pagination-controls__summary" :data-testid="`${testIdPrefix}-pagination-summary`">
      {{ `第 ${safePage} / ${safeTotalPages} 页 · 共 ${total} 条` }}
    </div>
    <div class="pagination-controls__actions">
      <label class="pagination-controls__size">
        <span>每页</span>
        <select
          :value="String(pageSize)"
          :data-testid="`${testIdPrefix}-page-size-select`"
          @change="handlePageSizeChange"
        >
          <option v-for="option in pageSizeOptions" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </label>
      <button
        class="button button--ghost"
        type="button"
        :data-testid="`${testIdPrefix}-page-prev`"
        :disabled="safePage <= 1"
        @click="$emit('prev')"
      >
        上一页
      </button>
      <button
        class="button button--ghost"
        type="button"
        :data-testid="`${testIdPrefix}-page-next`"
        :disabled="safePage >= safeTotalPages"
        @click="$emit('next')"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pageSizeOptions?: number[];
  testIdPrefix: string;
}>(), {
  pageSizeOptions: () => [8, 12, 24],
});

const emit = defineEmits<{
  "update:pageSize": [value: number];
  prev: [];
  next: [];
}>();

const safePage = computed(() => Math.max(1, props.page || 1));
const safeTotalPages = computed(() => Math.max(1, props.totalPages || 1));

function handlePageSizeChange(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) {
    return;
  }
  const nextValue = Number(target.value);
  if (!Number.isFinite(nextValue) || nextValue <= 0) {
    return;
  }
  emit("update:pageSize", nextValue);
}
</script>

<style scoped>
.pagination-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  padding-top: 6px;
}

.pagination-controls__summary {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.pagination-controls__actions,
.pagination-controls__size {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.pagination-controls__size span {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.pagination-controls__size select {
  min-height: 32px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  padding: 0 8px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-primary);
}
</style>

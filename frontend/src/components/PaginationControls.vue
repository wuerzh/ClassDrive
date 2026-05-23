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
        :data-testid="`${testIdPrefix}-page-first`"
        :disabled="safePage <= 1"
        @click="goPage(1)"
      >
        首页
      </button>
      <button
        class="button button--ghost"
        type="button"
        :data-testid="`${testIdPrefix}-page-prev`"
        :disabled="safePage <= 1"
        @click="$emit('prev')"
      >
        上一页
      </button>
      <div class="pagination-controls__pages" aria-label="页码">
        <template v-for="item in visiblePageItems" :key="item">
          <span v-if="typeof item === 'string'" class="pagination-controls__ellipsis" aria-hidden="true">...</span>
          <button
            v-else
            class="button button--ghost pagination-controls__page-number"
            :class="{ 'pagination-controls__page-number--active': item === safePage }"
            type="button"
            :data-testid="`${testIdPrefix}-page-number-${item}`"
            :aria-current="item === safePage ? 'page' : undefined"
            :disabled="item === safePage"
            @click="goPage(item)"
          >
            {{ item }}
          </button>
        </template>
      </div>
      <button
        class="button button--ghost"
        type="button"
        :data-testid="`${testIdPrefix}-page-next`"
        :disabled="safePage >= safeTotalPages"
        @click="$emit('next')"
      >
        下一页
      </button>
      <button
        class="button button--ghost"
        type="button"
        :data-testid="`${testIdPrefix}-page-last`"
        :disabled="safePage >= safeTotalPages"
        @click="goPage(safeTotalPages)"
      >
        尾页
      </button>
      <form class="pagination-controls__jump" :data-testid="`${testIdPrefix}-page-jump`" @submit.prevent="submitJump">
        <label class="pagination-controls__jump-field">
          <span>跳至</span>
          <input
            v-model="jumpPageText"
            type="number"
            inputmode="numeric"
            min="1"
            :max="safeTotalPages"
            :data-testid="`${testIdPrefix}-page-jump-input`"
            @focus="selectJumpText"
          />
          <span>页</span>
        </label>
        <button class="button button--ghost" type="submit" :data-testid="`${testIdPrefix}-page-jump-submit`">
          确定
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

type VisiblePageItem = number | "ellipsis-start" | "ellipsis-end";

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
  go: [page: number];
  prev: [];
  next: [];
}>();

const safeTotalPages = computed(() => Math.max(1, props.totalPages || 1));
const safePage = computed(() => Math.min(Math.max(1, props.page || 1), safeTotalPages.value));
const jumpPageText = ref("");
const visiblePageItems = computed<VisiblePageItem[]>(() => {
  const totalPages = safeTotalPages.value;
  const currentPage = safePage.value;
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis-start", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "ellipsis-start", currentPage - 1, currentPage, currentPage + 1, "ellipsis-end", totalPages];
});

watch(safePage, (value) => {
  jumpPageText.value = String(value);
}, { immediate: true });

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

function normalizePage(value: number): number {
  if (!Number.isFinite(value)) {
    return safePage.value;
  }
  return Math.min(Math.max(1, Math.trunc(value)), safeTotalPages.value);
}

function goPage(page: number): void {
  const nextPage = normalizePage(page);
  if (nextPage === safePage.value) {
    return;
  }
  emit("go", nextPage);
}

function submitJump(): void {
  const nextPage = normalizePage(Number(jumpPageText.value));
  jumpPageText.value = String(nextPage);
  goPage(nextPage);
}

function selectJumpText(event: FocusEvent): void {
  const target = event.target;
  if (target instanceof HTMLInputElement) {
    target.select();
  }
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
.pagination-controls__size,
.pagination-controls__pages,
.pagination-controls__jump,
.pagination-controls__jump-field {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.pagination-controls__size span {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.pagination-controls__size select,
.pagination-controls__jump input {
  min-height: 32px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  padding: 0 8px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-primary);
}

.pagination-controls__pages {
  gap: 4px;
}

.pagination-controls__page-number {
  min-width: 34px;
  padding-inline: 8px;
}

.pagination-controls__page-number--active {
  border-color: color-mix(in srgb, var(--accent-primary) 44%, var(--border-soft));
  background: var(--bg-subtle);
  color: var(--accent-primary);
  font-weight: 700;
}

.pagination-controls__ellipsis {
  min-width: 20px;
  color: var(--text-muted);
  text-align: center;
}

.pagination-controls__jump {
  gap: 6px;
}

.pagination-controls__jump-field span {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.pagination-controls__jump input {
  width: 4.5rem;
}

@media (max-width: 640px) {
  .pagination-controls {
    align-items: stretch;
  }

  .pagination-controls__summary,
  .pagination-controls__actions,
  .pagination-controls__pages,
  .pagination-controls__jump {
    width: 100%;
  }

  .pagination-controls__actions {
    justify-content: flex-start;
  }

  .pagination-controls__pages {
    order: 2;
  }

  .pagination-controls__jump {
    order: 3;
  }

  .pagination-controls__jump input {
    flex: 1 1 4.5rem;
    min-width: 0;
  }
}
</style>

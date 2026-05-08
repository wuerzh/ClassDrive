<template>
  <div ref="rootRef" class="filter-select" :data-testid="testId">
    <button
      class="filter-select__trigger"
      type="button"
      :data-testid="`${testId}-trigger`"
      :aria-expanded="open"
      @click="toggleOpen"
    >
      <span class="filter-select__value">{{ selectedLabel }}</span>
      <span class="filter-select__chevron">▾</span>
    </button>

    <div v-if="open" class="filter-select__panel" :data-testid="`${testId}-panel`">
      <input
        ref="searchInputRef"
        v-model="keyword"
        class="filter-select__search"
        type="text"
        :placeholder="searchPlaceholder"
        :data-testid="`${testId}-search`"
        @keydown.esc.stop.prevent="closeOpen"
      />
      <div class="filter-select__options">
        <button
          v-for="option in filteredOptions"
          :key="String(option.value)"
          class="filter-select__option"
          :class="{ 'is-active': option.value === modelValue }"
          type="button"
          :data-testid="`${testId}-option-${String(option.value)}`"
          @click="selectOption(option)"
        >
          {{ option.label }}
        </button>
        <p v-if="filteredOptions.length === 0" class="filter-select__empty">没有匹配项</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

export interface FilterSelectOption {
  label: string;
  value: number | string;
}

const props = withDefaults(defineProps<{
  modelValue: number | string | null;
  options: FilterSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  testId?: string;
}>(), {
  placeholder: "请选择",
  searchPlaceholder: "输入关键词筛选",
  testId: "filter-select",
});

const emit = defineEmits<{
  "update:modelValue": [value: number | string];
  change: [value: number | string];
}>();

const open = ref(false);
const keyword = ref("");
const rootRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);

const selectedLabel = computed(() => {
  return props.options.find((item) => item.value === props.modelValue)?.label ?? props.placeholder;
});

const filteredOptions = computed(() => {
  const search = keyword.value.trim();
  if (!search) {
    return props.options;
  }
  const normalizedSearch = search.toLocaleLowerCase("zh-CN");
  return props.options.filter((option) => option.label.toLocaleLowerCase("zh-CN").includes(normalizedSearch));
});

async function toggleOpen() {
  open.value = !open.value;
  if (!open.value) {
    keyword.value = "";
    return;
  }
  await nextTick();
  searchInputRef.value?.focus();
}

function closeOpen() {
  open.value = false;
  keyword.value = "";
}

function selectOption(option: FilterSelectOption) {
  emit("update:modelValue", option.value);
  emit("change", option.value);
  closeOpen();
}

function handleDocumentPointerDown(event: Event) {
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }
  if (rootRef.value?.contains(target)) {
    return;
  }
  closeOpen();
}

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
});
</script>

<style scoped>
.filter-select {
  position: relative;
  min-width: 190px;
}

.filter-select__trigger {
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--control-border);
  border-radius: 12px;
  padding: 0 12px;
  background: var(--control-bg);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
}

.filter-select__trigger:focus-visible,
.filter-select__search:focus-visible {
  outline: none;
  border-color: rgba(37, 99, 235, 0.36);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
}

.filter-select__value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-select__chevron {
  color: var(--text-secondary);
  font-size: 12px;
}

.filter-select__panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 1200;
  min-width: min(280px, calc(100vw - 32px));
  padding: 8px;
  border-radius: 14px;
  border: 1px solid var(--control-border);
  background: var(--popover-bg);
  box-shadow: var(--popover-shadow);
}

.filter-select__search {
  width: 100%;
  min-height: 38px;
  border: 1px solid var(--control-border);
  border-radius: 12px;
  padding: 0 12px;
  background: var(--control-bg);
  color: var(--text-primary);
}

.filter-select__options {
  max-height: 240px;
  overflow: auto;
  display: grid;
  gap: 6px;
  margin-top: 8px;
}

.filter-select__option {
  width: 100%;
  min-height: 34px;
  border: 0;
  border-radius: 12px;
  padding: 0 12px;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.filter-select__option:hover,
.filter-select__option.is-active {
  background: rgba(37, 99, 235, 0.1);
  color: var(--accent-primary);
  font-weight: 700;
}

.filter-select__empty {
  margin: 6px 0 0;
  padding: 8px 12px;
  color: var(--text-muted);
  font-size: 13px;
}

:global(:root.dark) .filter-select__option:hover,
:global(:root.dark) .filter-select__option.is-active {
  background: rgba(59, 130, 246, 0.24);
  color: #bfdbfe;
}

:global(:root.dark) .filter-select__trigger,
:global(:root.dark) .filter-select__search {
  background: rgba(8, 15, 28, 0.98);
  border-color: rgba(147, 197, 253, 0.28);
  color: var(--text-primary);
}

:global(:root.dark) .filter-select__panel {
  background: rgba(3, 10, 24, 0.98);
  border-color: rgba(147, 197, 253, 0.3);
  box-shadow: 0 22px 44px rgba(2, 6, 23, 0.55);
}
</style>

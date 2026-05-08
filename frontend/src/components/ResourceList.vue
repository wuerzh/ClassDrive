<template>
  <div :data-testid="testId">
    <p v-if="loading" class="muted">{{ loadingMessage }}</p>
    <p v-else-if="!items.length && emptyMessage" class="muted">{{ emptyMessage }}</p>
    <ul v-else class="resource-list" :class="listClass">
      <li
        v-for="item in items"
        :key="item.id"
        class="resource-list__item"
        :class="itemClass"
        :data-testid="resolveItemTestId(item.id)"
      >
        <component
          :is="resolveNameTag(item)"
          class="resource-list__name"
          :class="resolveNameClass(item)"
          :href="item.href"
          :type="item.onClick ? 'button' : undefined"
          :target="item.openInNewTab ? '_blank' : undefined"
          :rel="item.openInNewTab ? 'noreferrer' : undefined"
          :data-testid="resolveLinkTestId(item.id)"
          @click="item.onClick?.()"
        >
          {{ item.name }}
        </component>
        <span v-if="item.meta" class="muted">{{ item.meta }}</span>
        <slot name="item-actions" :item="item" />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

export interface ResourceListItem {
  id: number | string;
  name: string;
  href?: string;
  meta?: string;
  openInNewTab?: boolean;
  onClick?: () => void;
  index?: number;
  pinned?: boolean;
}

const props = withDefaults(defineProps<{
  items: ResourceListItem[];
  emptyMessage?: string;
  loading?: boolean;
  loadingMessage?: string;
  variant?: "chips" | "rows";
  testId?: string;
  itemTestIdPrefix?: string;
  linkTestIdPrefix?: string;
}>(), {
  loading: false,
  loadingMessage: "正在加载资源...",
  variant: "chips",
  testId: "resource-list",
  emptyMessage: "",
  itemTestIdPrefix: "",
  linkTestIdPrefix: "",
});

const listClass = computed(() => (
  props.variant === "rows"
    ? "resource-list--rows"
    : "copy-dialog__recent-list resource-list--chips"
));

const itemClass = computed(() => (
  props.variant === "rows"
    ? "resource-list__item--row"
    : "copy-dialog__recent-item resource-list__item--chip"
));

function resolveItemTestId(id: number | string) {
  return props.itemTestIdPrefix ? `${props.itemTestIdPrefix}-${id}` : undefined;
}

function resolveLinkTestId(id: number | string) {
  return props.linkTestIdPrefix ? `${props.linkTestIdPrefix}-${id}` : undefined;
}

function resolveNameTag(item: ResourceListItem) {
  if (item.href) {
    return "a";
  }
  if (item.onClick) {
    return "button";
  }
  return props.variant === "rows" ? "strong" : "span";
}

function resolveNameClass(item: ResourceListItem) {
  if (props.variant === "rows") {
    return item.href ? "resource-list__row-link" : "resource-list__row-text";
  }
  return "copy-dialog__recent-button";
}
</script>

<style scoped>
.resource-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.resource-list__item {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.resource-list--rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resource-list__item--row {
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-soft);
}

.resource-list__row-link,
.resource-list__row-text {
  color: var(--text-primary);
}
</style>

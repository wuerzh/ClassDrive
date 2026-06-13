<template>
  <div class="toast-stack" aria-live="polite" role="status" data-testid="toast-stack">
    <div
      v-for="item in visibleItems"
      :key="item.id"
      class="toast"
      :class="`toast--${item.tone}`"
      data-testid="toast-item"
    >
      <span class="toast__text">{{ item.text }}</span>
      <button
        class="toast__close"
        type="button"
        :aria-label="`关闭通知: ${item.text}`"
        :data-testid="`toast-close-${item.id}`"
        @click="toastStore.remove(item.id)"
      >
        &times;
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useToastStore } from "@/stores/toast";

const toastStore = useToastStore();

const MAX_VISIBLE_TOASTS = 5;

const visibleItems = computed(() => {
  return toastStore.items.slice(0, MAX_VISIBLE_TOASTS);
});
</script>

<style scoped>
.toast-stack {
  position: fixed;
  right: 16px;
  top: 16px;
  display: grid;
  gap: 8px;
  z-index: 2100;
}

.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 220px;
  padding: 12px 14px;
  border-radius: 14px;
  color: #fff;
  box-shadow: 0 16px 30px rgba(45, 37, 24, 0.16);
}

.toast--success {
  background: var(--success);
}

.toast--warning {
  background: var(--accent-warning);
}

.toast--error {
  background: var(--danger);
}

.toast__text {
  flex: 1;
  min-width: 0;
}

.toast__close {
  flex: none;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s;
}

.toast__close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.3);
}
</style>

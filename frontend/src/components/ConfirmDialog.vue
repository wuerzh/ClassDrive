<template>
  <div v-if="open" class="copy-dialog-backdrop" @click.self="$emit('cancel')">
    <section class="copy-dialog" :data-testid="`${testIdPrefix}-dialog`">
      <div class="copy-dialog__header">
        <div>
          <div class="copy-dialog__eyebrow">{{ eyebrow }}</div>
          <h3 class="copy-dialog__title">{{ title }}</h3>
        </div>
        <button class="button button--ghost" type="button" :data-testid="`${testIdPrefix}-cancel-top`" @click="$emit('cancel')">
          关闭
        </button>
      </div>

      <p class="muted" :data-testid="`${testIdPrefix}-message`">{{ message }}</p>

      <div class="copy-dialog__actions">
        <button class="button" type="button" :data-testid="`${testIdPrefix}-cancel`" @click="$emit('cancel')">
          {{ cancelLabel }}
        </button>
        <button
          class="button"
          :class="confirmButtonClass"
          type="button"
          :data-testid="`${testIdPrefix}-confirm`"
          @click="$emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{
  open: boolean;
  title: string;
  message: string;
  testIdPrefix: string;
  eyebrow?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: "primary" | "danger";
}>(), {
  eyebrow: "操作确认",
  confirmLabel: "确认",
  cancelLabel: "取消",
  confirmTone: "primary",
});

defineEmits<{
  confirm: [];
  cancel: [];
}>();

const confirmButtonClass = computed(() => {
  return props.confirmTone === "danger" ? "text-button--danger confirm-dialog__danger" : "button--primary";
});
</script>

<style scoped>
.copy-dialog-backdrop {
  z-index: 5200;
}

.confirm-dialog__danger {
  border-color: rgba(194, 65, 12, 0.22);
  background: rgba(194, 65, 12, 0.08);
  color: var(--danger);
}
</style>

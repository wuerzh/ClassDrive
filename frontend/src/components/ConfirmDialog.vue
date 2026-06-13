<template>
  <div
    v-if="open"
    ref="dialogBackdropRef"
    class="copy-dialog-backdrop"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="`${testIdPrefix}-title`"
    @click.self="handleCancel"
    @keydown.esc.stop.prevent="handleCancel"
  >
    <section class="copy-dialog" :data-testid="`${testIdPrefix}-dialog`">
      <div class="copy-dialog__header">
        <div>
          <div class="copy-dialog__eyebrow">{{ eyebrow }}</div>
          <h3 :id="`${testIdPrefix}-title`" class="copy-dialog__title">{{ title }}</h3>
        </div>
        <button class="button button--ghost" type="button" :data-testid="`${testIdPrefix}-cancel-top`" @click="handleCancel">
          关闭
        </button>
      </div>

      <p class="muted" :data-testid="`${testIdPrefix}-message`">{{ message }}</p>

      <div class="copy-dialog__actions">
        <button class="button" type="button" :data-testid="`${testIdPrefix}-cancel`" @click="handleCancel">
          {{ cancelLabel }}
        </button>
        <button
          class="button"
          :class="confirmButtonClass"
          type="button"
          :data-testid="`${testIdPrefix}-confirm`"
          @click="handleConfirm"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useFocusTrap } from "@/composables/useFocusTrap";

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

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const dialogBackdropRef = ref<HTMLElement | null>(null);
const openRef = computed(() => props.open);

useFocusTrap(dialogBackdropRef, () => emit("cancel"), openRef);

const confirmButtonClass = computed(() => {
  return props.confirmTone === "danger" ? "text-button--danger confirm-dialog__danger" : "button--primary";
});

function handleCancel(): void {
  emit("cancel");
}

function handleConfirm(): void {
  emit("confirm");
}
</script>

<style scoped>
.copy-dialog-backdrop {
  z-index: 5200;
}

.confirm-dialog__danger {
  border-color: color-mix(in srgb, var(--danger), transparent 78%);
  background: color-mix(in srgb, var(--danger), transparent 92%);
  color: var(--danger);
}
</style>

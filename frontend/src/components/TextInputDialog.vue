<template>
  <div
    v-if="open"
    ref="dialogBackdropRef"
    class="copy-dialog-backdrop"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="`${testIdPrefix}-title`"
    @click.self="emit('cancel')"
  >
    <section class="copy-dialog" :data-testid="`${testIdPrefix}-dialog`">
      <div class="copy-dialog__header">
        <div>
          <div class="copy-dialog__eyebrow">{{ eyebrow }}</div>
          <h3 :id="`${testIdPrefix}-title`" class="copy-dialog__title">{{ title }}</h3>
        </div>
        <button class="button button--ghost" type="button" :data-testid="`${testIdPrefix}-cancel-top`" @click="emit('cancel')">
          关闭
        </button>
      </div>

      <label class="field">
        <span>{{ label }}</span>
        <input
          v-model="draftValue"
          class="copy-dialog__search"
          type="text"
          :placeholder="placeholder"
          :data-testid="`${testIdPrefix}-input`"
        />
      </label>

      <div class="copy-dialog__actions">
        <button class="button" type="button" :data-testid="`${testIdPrefix}-cancel`" @click="emit('cancel')">
          取消
        </button>
        <button
          class="button button--primary"
          type="button"
          :data-testid="`${testIdPrefix}-confirm`"
          :disabled="!draftValue.trim()"
          @click="emit('confirm', draftValue.trim())"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useFocusTrap } from "@/composables/useFocusTrap";

const props = withDefaults(defineProps<{
  open: boolean;
  testIdPrefix: string;
  title: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  eyebrow?: string;
  confirmLabel?: string;
}>(), {
  initialValue: "",
  placeholder: "",
  eyebrow: "输入信息",
  confirmLabel: "确认",
});

const emit = defineEmits<{
  cancel: [];
  confirm: [value: string];
}>();

const dialogBackdropRef = ref<HTMLElement | null>(null);
const openRef = computed(() => props.open);

useFocusTrap(dialogBackdropRef, () => emit("cancel"), openRef);

const draftValue = ref("");

watch(
  () => [props.open, props.initialValue] as const,
  ([open, initialValue]) => {
    if (!open) {
      return;
    }
    draftValue.value = initialValue ?? "";
  },
  { immediate: true },
);
</script>

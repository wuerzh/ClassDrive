<template>
  <div v-if="open" class="copy-dialog-backdrop" @click.self="emit('cancel')">
    <section class="copy-dialog" :data-testid="`${testIdPrefix}-dialog`">
      <div class="copy-dialog__header">
        <div>
          <div class="copy-dialog__eyebrow">{{ eyebrow }}</div>
          <h3 class="copy-dialog__title">{{ title }}</h3>
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
import { ref, watch } from "vue";

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

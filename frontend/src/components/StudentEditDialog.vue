<template>
  <div v-if="open" class="copy-dialog-backdrop" @click.self="emit('cancel')">
    <section class="copy-dialog" data-testid="student-edit-dialog">
      <div class="copy-dialog__header">
        <div>
          <div class="copy-dialog__eyebrow">{{ eyebrow }}</div>
          <h3 class="copy-dialog__title">{{ title }}</h3>
        </div>
        <button class="button button--ghost" type="button" data-testid="student-edit-cancel-top" @click="emit('cancel')">
          关闭
        </button>
      </div>

      <label class="field">
        <span>学号</span>
        <input v-model="draftStudentNo" class="copy-dialog__search" type="text" data-testid="student-edit-no" />
      </label>

      <label class="field">
        <span>姓名</span>
        <input v-model="draftDisplayName" class="copy-dialog__search" type="text" data-testid="student-edit-name" />
      </label>

      <div class="copy-dialog__actions">
        <button class="button" type="button" data-testid="student-edit-cancel" @click="emit('cancel')">
          取消
        </button>
        <button class="button button--primary" type="button" data-testid="student-edit-confirm" :disabled="confirmDisabled" @click="submit">
          {{ confirmLabel }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  studentNo: string;
  displayName: string;
  title?: string;
  eyebrow?: string;
  confirmLabel?: string;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [payload: { studentNo: string; displayName: string }];
}>();

const draftStudentNo = ref("");
const draftDisplayName = ref("");

const title = computed(() => props.title ?? "编辑学生信息");
const eyebrow = computed(() => props.eyebrow ?? "学生编辑");
const confirmLabel = computed(() => props.confirmLabel ?? "保存修改");

watch(
  () => [props.open, props.studentNo, props.displayName] as const,
  ([open, studentNo, displayName]) => {
    if (!open) {
      return;
    }
    draftStudentNo.value = studentNo;
    draftDisplayName.value = displayName;
  },
  { immediate: true },
);

const confirmDisabled = computed(() => {
  return !draftStudentNo.value.trim() || !draftDisplayName.value.trim();
});

function submit() {
  if (confirmDisabled.value) {
    return;
  }
  emit("confirm", {
    studentNo: draftStudentNo.value.trim(),
    displayName: draftDisplayName.value.trim(),
  });
}
</script>

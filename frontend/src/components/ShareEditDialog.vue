<template>
  <div
    v-if="open"
    class="copy-dialog-backdrop"
    role="dialog"
    aria-modal="true"
    @click.self="handleClose"
    @keydown.esc.stop.prevent="handleClose"
  >
    <section class="copy-dialog" data-testid="share-edit-dialog">
      <div class="copy-dialog__header">
        <div>
          <div class="copy-dialog__eyebrow">编辑分享</div>
          <h3 class="copy-dialog__title">{{ share?.entryName ?? '' }}</h3>
        </div>
        <button class="button button--ghost" type="button" @click="handleClose">
          关闭
        </button>
      </div>

      <form class="share-edit-dialog__form" @submit.prevent="handleSubmit">
        <label class="field">
          <span>权限</span>
          <select v-model="permission" class="app-select">
            <option value="view">仅查看</option>
            <option value="download">允许下载</option>
          </select>
        </label>

        <label class="field">
          <span>有效期</span>
          <select v-model="expiresPreset" class="app-select" @change="handleExpiresPresetChange">
            <option value="1">1 天</option>
            <option value="7">7 天</option>
            <option value="30">30 天</option>
            <option value="custom">自定义</option>
            <option value="">永久</option>
          </select>
        </label>

        <label v-if="expiresPreset === 'custom'" class="field">
          <span>截止日期（YYYY-MM-DD）</span>
          <input
            v-model="customExpiresDate"
            type="text"
            class="copy-dialog__search"
            placeholder="2026-12-31"
            pattern="\d{4}-\d{2}-\d{2}"
          />
        </label>

        <p v-if="formError" class="share-edit-dialog__error">{{ formError }}</p>

        <div class="copy-dialog__actions">
          <button type="button" class="button" @click="handleClose">取消</button>
          <button
            type="submit"
            class="button button--primary"
            :disabled="loading"
            data-testid="share-edit-submit"
          >
            保存
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useLibrarySharesStore } from "@/stores/library-shares";
import { ApiError, type LibraryShareItem } from "@/api/client";

const props = defineProps<{
  open: boolean;
  share: LibraryShareItem | null;
}>();

const emit = defineEmits<{
  close: [];
  updated: [];
}>();

const librarySharesStore = useLibrarySharesStore();

const loading = ref(false);
const permission = ref<"view" | "download">("view");
const expiresPreset = ref("7");
const customExpiresDate = ref("");
const formError = ref("");

const minDate = computed(() => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
});

function handleExpiresPresetChange() {
  if (expiresPreset.value === "custom") {
    customExpiresDate.value = minDate.value;
  }
}

function computeExpiresAt(): string {
  if (expiresPreset.value === "") {
    return "";
  }
  if (expiresPreset.value === "custom") {
    if (!customExpiresDate.value) {
      return "";
    }
    const date = new Date(customExpiresDate.value);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }
  const days = Number(expiresPreset.value);
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

async function handleSubmit() {
  formError.value = "";
  if (!props.share) {
    formError.value = "无效的分享";
    return;
  }

  const expiresAt = computeExpiresAt();
  if (expiresPreset.value === "custom" && !expiresAt) {
    formError.value = "请选择有效的截止日期";
    return;
  }

  loading.value = true;
  try {
    await librarySharesStore.update(props.share.id, {
      permission: permission.value,
      expiresAt,
    });
    emit("updated");
    emit("close");
  } catch (error) {
    formError.value = error instanceof ApiError ? error.message : "更新分享失败";
  } finally {
    loading.value = false;
  }
}

function handleClose() {
  emit("close");
}

function syncForm() {
  if (!props.share) return;
  permission.value = props.share.permission;

  if (!props.share.expiresAt) {
    expiresPreset.value = "";
  } else {
    const expires = new Date(props.share.expiresAt);
    const now = new Date();
    const diffDays = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1 || diffDays === 7 || diffDays === 30) {
      expiresPreset.value = String(diffDays);
    } else {
      expiresPreset.value = "custom";
      customExpiresDate.value = expires.toISOString().split("T")[0];
    }
  }

  formError.value = "";
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    syncForm();
  }
});
</script>

<style scoped>
.share-edit-dialog__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.share-edit-dialog__error {
  color: var(--color-error);
  margin: 0;
}
</style>

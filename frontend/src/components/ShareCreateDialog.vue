<template>
  <div
    v-if="open"
    class="copy-dialog-backdrop"
    role="dialog"
    aria-modal="true"
    @click.self="handleClose"
    @keydown.esc.stop.prevent="handleClose"
  >
    <section class="copy-dialog" data-testid="share-create-dialog">
      <div class="copy-dialog__header">
        <div>
          <div class="copy-dialog__eyebrow">{{ dialogTitle }}</div>
          <h3 class="copy-dialog__title">{{ entry?.name ?? '' }}</h3>
        </div>
        <button class="button button--ghost" type="button" @click="handleClose">
          关闭
        </button>
      </div>

      <form v-if="!result" class="share-create-dialog__form" @submit.prevent="handleSubmit">
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

        <label class="share-create-dialog__checkbox">
          <input v-model="requireAccessCode" type="checkbox" />
          <span>需要安全码访问</span>
        </label>

        <p v-if="formError" class="share-create-dialog__error">{{ formError }}</p>

        <div class="copy-dialog__actions">
          <button type="button" class="button" @click="handleClose">取消</button>
          <button
            type="submit"
            class="button button--primary"
            :disabled="loading"
            data-testid="share-create-submit"
          >
            创建分享
          </button>
        </div>
      </form>

      <div v-else class="share-create-dialog__result">
        <p class="share-create-dialog__success">✓ 分享创建成功</p>

        <div class="share-create-dialog__info">
          <label class="field">
            <span>分享链接</span>
            <input
              :value="shareUrl"
              readonly
              class="copy-dialog__search"
              data-testid="share-url-input"
            />
          </label>

          <label v-if="result.accessCode" class="field">
            <span>安全码</span>
            <input
              :value="result.accessCode"
              readonly
              class="copy-dialog__search"
              data-testid="share-code-input"
            />
          </label>

          <div class="share-create-dialog__meta">
            <p><strong>权限：</strong>{{ permissionLabel }}</p>
            <p><strong>有效期：</strong>{{ expiresLabel }}</p>
          </div>
        </div>

        <div class="copy-dialog__actions">
          <button type="button" class="button" @click="handleClose">关闭</button>
          <button
            type="button"
            class="button button--primary"
            data-testid="share-copy-btn"
            @click.stop="handleCopy"
          >
            复制分享信息
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useLibrarySharesStore } from "@/stores/library-shares";
import { useSystemSettingsStore } from "@/stores/system-settings";
import { useToastStore } from "@/stores/toast";
import { ApiError, type FileItem, type LibraryShareMutationResult } from "@/api/client";

const props = defineProps<{
  open: boolean;
  entry: FileItem | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const librarySharesStore = useLibrarySharesStore();
const systemSettingsStore = useSystemSettingsStore();
const toastStore = useToastStore();

const loading = ref(false);
const permission = ref<"view" | "download">("view");
const requireAccessCode = ref(true);
const expiresPreset = ref("7");
const customExpiresDate = ref("");
const formError = ref("");
const result = ref<LibraryShareMutationResult | null>(null);

const dialogTitle = computed(() => (result.value ? "分享信息" : "创建分享"));
const permissionLabel = computed(() => (permission.value === "view" ? "仅查看" : "允许下载"));
const minDate = computed(() => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
});

const expiresLabel = computed(() => {
  if (!result.value) return "";
  const share = result.value.share;
  if (!share.expiresAt) return "永久";
  const date = new Date(share.expiresAt);
  return date.toLocaleDateString("zh-CN");
});

const shareUrl = computed(() => {
  if (!result.value) return "";
  const origin = window.location.origin;
  return `${origin}/share/${result.value.share.token}`;
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
  if (!props.entry) {
    formError.value = "无效的分享对象";
    return;
  }

  const expiresAt = computeExpiresAt();
  if (expiresPreset.value === "custom" && !expiresAt) {
    formError.value = "请选择有效的截止日期";
    return;
  }

  loading.value = true;
  try {
    const created = await librarySharesStore.create({
      entryId: props.entry.id,
      permission: permission.value,
      requireAccessCode: requireAccessCode.value,
      expiresAt,
    });
    result.value = created;
  } catch (error) {
    formError.value = error instanceof ApiError ? error.message : "创建分享失败";
  } finally {
    loading.value = false;
  }
}

function handleCopy() {
  if (!result.value) return;
  let text = `分享链接：${shareUrl.value}`;
  if (result.value.accessCode) {
    text += `\n安全码：${result.value.accessCode}`;
  }
  text += `\n权限：${permissionLabel.value}`;
  text += `\n有效期：${expiresLabel.value}`;

  navigator.clipboard.writeText(text).then(
    () => toastStore.push("success", "已复制分享信息"),
    () => toastStore.push("error", "复制失败"),
  );
}

function handleClose() {
  emit("close");
}

function resetForm() {
  const defaultDays = systemSettingsStore.settings?.defaultShareExpiresDays ?? 7;
  permission.value = "view";
  requireAccessCode.value = true;
  expiresPreset.value = String(defaultDays);
  customExpiresDate.value = "";
  formError.value = "";
  result.value = null;
  loading.value = false;
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    resetForm();
  }
});
</script>

<style scoped>
.share-create-dialog__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.share-create-dialog__checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.share-create-dialog__error {
  color: var(--color-error);
  margin: 0;
}

.share-create-dialog__result {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.share-create-dialog__success {
  color: var(--color-success);
  font-weight: 500;
  font-size: 1.1rem;
  margin: 0;
}

.share-create-dialog__info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.share-create-dialog__meta {
  padding: 0.75rem;
  background: var(--color-background-soft);
  border-radius: 4px;
}

.share-create-dialog__meta p {
  margin: 0.25rem 0;
}
</style>

<template>
  <div
    v-if="open"
    class="copy-dialog-backdrop"
    role="dialog"
    aria-modal="true"
    @click.self="handleClose"
    @keydown.esc.stop.prevent="handleClose"
  >
    <section class="copy-dialog copy-dialog--wide" data-testid="share-manage-dialog">
      <div class="copy-dialog__header">
        <div>
          <div class="copy-dialog__eyebrow">分享管理</div>
          <h3 class="copy-dialog__title">老师资料分享列表</h3>
        </div>
        <button class="button button--ghost" type="button" @click="handleClose">
          关闭
        </button>
      </div>

      <div v-if="shares.length === 0 && !loading" class="share-manage-dialog__empty">
        <p class="muted">暂无分享记录</p>
      </div>

      <div v-else class="share-manage-dialog__list">
        <table class="share-manage-dialog__table">
          <thead>
            <tr>
              <th>分享对象</th>
              <th>权限</th>
              <th>状态</th>
              <th>访问次数</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="share in shares" :key="share.id" :data-testid="`share-row-${share.id}`">
              <td>
                <div class="share-manage-dialog__entry">
                  <span class="share-manage-dialog__icon">{{ share.entryKind === "dir" ? "📁" : "📄" }}</span>
                  <span>{{ share.entryName }}</span>
                </div>
              </td>
              <td>{{ share.permission === "view" ? "仅查看" : "允许下载" }}</td>
              <td>
                <span :class="['share-manage-dialog__status', `share-manage-dialog__status--${share.status}`]">
                  {{ formatStatus(share) }}
                </span>
              </td>
              <td>{{ share.accessCount }}</td>
              <td>{{ formatDate(share.createdAt) }}</td>
              <td>
                <div class="share-manage-dialog__actions">
                  <button
                    type="button"
                    class="button button--sm"
                    :data-testid="`share-copy-${share.id}`"
                    @click="handleCopy(share)"
                  >
                    复制
                  </button>
                  <button
                    v-if="!share.disabled"
                    type="button"
                    class="button button--sm"
                    :data-testid="`share-edit-${share.id}`"
                    @click="handleEdit(share)"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    class="button button--sm"
                    :data-testid="`share-toggle-${share.id}`"
                    @click="handleToggle(share)"
                  >
                    {{ share.disabled ? "启用" : "停用" }}
                  </button>
                  <button
                    type="button"
                    class="button button--sm"
                    :data-testid="`share-delete-${share.id}`"
                    @click="handleDelete(share)"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <ShareEditDialog
      :open="editDialogOpen"
      :share="editingShare"
      @close="editDialogOpen = false"
      @updated="handleUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ShareEditDialog from "@/components/ShareEditDialog.vue";
import { useLibrarySharesStore } from "@/stores/library-shares";
import { useToastStore } from "@/stores/toast";
import { ApiError, type LibraryShareItem } from "@/api/client";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const librarySharesStore = useLibrarySharesStore();
const toastStore = useToastStore();

const loading = ref(false);
const editDialogOpen = ref(false);
const editingShare = ref<LibraryShareItem | null>(null);

const shares = computed(() => librarySharesStore.shares);

function formatStatus(share: LibraryShareItem): string {
  switch (share.status) {
    case "active":
      return "活跃";
    case "disabled":
      return "已停用";
    case "expired":
      return "已过期";
    case "invalid":
      return "源文件已删除";
    default:
      return share.status;
  }
}

function formatDate(isoString: string): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleDateString("zh-CN");
}

function buildShareUrl(token: string): string {
  const origin = window.location.origin;
  return `${origin}/share/${token}`;
}

function handleCopy(share: LibraryShareItem) {
  const url = buildShareUrl(share.token);
  let text = `分享链接：${url}`;
  if (share.requiresAccessCode) {
    text += "\n安全码：（已隐藏，请从创建时保存的记录获取）";
  }
  text += `\n权限：${share.permission === "view" ? "仅查看" : "允许下载"}`;
  if (share.expiresAt) {
    text += `\n有效期：${formatDate(share.expiresAt)}`;
  } else {
    text += "\n有效期：永久";
  }

  navigator.clipboard.writeText(text).then(
    () => toastStore.push("success", "已复制分享信息"),
    () => toastStore.push("error", "复制失败"),
  );
}

function handleEdit(share: LibraryShareItem) {
  editingShare.value = share;
  editDialogOpen.value = true;
}

async function handleToggle(share: LibraryShareItem) {
  try {
    await librarySharesStore.update(share.id, { disabled: !share.disabled });
    toastStore.push("success", share.disabled ? "分享已启用" : "分享已停用");
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "操作失败");
  }
}

async function handleDelete(share: LibraryShareItem) {
  if (!confirm(`确定删除对"${share.entryName}"的分享吗？此操作不可恢复。`)) {
    return;
  }

  try {
    await librarySharesStore.remove(share.id);
    toastStore.push("success", "分享已删除");
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "删除失败");
  }
}

function handleUpdated() {
  toastStore.push("success", "分享已更新");
}

function handleClose() {
  emit("close");
}

async function loadShares() {
  loading.value = true;
  try {
    await librarySharesStore.load(true);
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "加载分享列表失败");
  } finally {
    loading.value = false;
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    loadShares();
  }
});
</script>

<style scoped>
.copy-dialog--wide {
  max-width: 960px;
  width: 90vw;
}

.share-manage-dialog__empty {
  padding: 2rem;
  text-align: center;
}

.share-manage-dialog__list {
  overflow-x: auto;
  max-height: 60vh;
}

.share-manage-dialog__table {
  width: 100%;
  border-collapse: collapse;
}

.share-manage-dialog__table th,
.share-manage-dialog__table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.share-manage-dialog__table th {
  font-weight: 600;
  background: var(--color-background-soft);
  position: sticky;
  top: 0;
}

.share-manage-dialog__entry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.share-manage-dialog__icon {
  font-size: 1.2rem;
}

.share-manage-dialog__status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  white-space: nowrap;
}

.share-manage-dialog__status--active {
  background: #e8f5e9;
  color: #2e7d32;
}

.share-manage-dialog__status--disabled,
.share-manage-dialog__status--expired,
.share-manage-dialog__status--invalid {
  background: #ffebee;
  color: #c62828;
}

.share-manage-dialog__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>

<template>
  <div class="share-view">
    <div v-if="!verified" class="share-view__verify">
      <div class="share-view__verify-card">
        <h1 class="share-view__title">访问分享</h1>

        <div v-if="shareInfo" class="share-view__info">
          <div class="share-view__icon">
            {{ shareInfo.entryKind === "dir" ? "📁" : "📄" }}
          </div>
          <h2 class="share-view__entry-name">{{ shareInfo.entryName }}</h2>
          <p class="muted">{{ permissionLabel }}</p>
        </div>

        <form v-if="shareInfo?.requiresAccessCode" class="share-view__form" @submit.prevent="handleVerify">
          <label class="field">
            <span>请输入安全码</span>
            <input
              v-model="accessCode"
              type="text"
              class="copy-dialog__search"
              placeholder="输入安全码以访问"
              data-testid="share-access-code-input"
              autofocus
            />
          </label>

          <p v-if="verifyError" class="share-view__error">{{ verifyError }}</p>

          <button
            type="submit"
            class="button button--primary"
            :disabled="verifying || !accessCode.trim()"
            data-testid="share-verify-submit"
          >
            {{ verifying ? "验证中..." : "访问" }}
          </button>
        </form>

        <p v-if="loadError" class="share-view__error">{{ loadError }}</p>
      </div>
    </div>

    <div v-else class="share-view__content">
      <div class="share-view__header">
        <div class="share-view__breadcrumb">
          <button
            class="share-view__breadcrumb-btn"
            type="button"
            data-testid="share-breadcrumb-root"
            @click="navigateToPath('')"
          >
            {{ shareInfo?.entryName }}
          </button>
          <template v-for="crumb in breadcrumbs" :key="crumb.path">
            <span class="share-view__breadcrumb-sep">/</span>
            <button
              v-if="!crumb.isCurrent"
              class="share-view__breadcrumb-btn"
              type="button"
              :data-testid="`share-breadcrumb-${crumb.label}`"
              @click="navigateToPath(crumb.path)"
            >
              {{ crumb.label }}
            </button>
            <span v-else class="share-view__breadcrumb-current">
              {{ crumb.label }}
            </span>
          </template>
        </div>

        <div class="share-view__meta">
          <span class="share-view__permission">{{ permissionLabel }}</span>
        </div>
      </div>

      <div v-if="shareInfo?.entryKind === 'file' && currentPath === ''" class="share-view__file-preview">
        <div class="share-view__file-card">
          <div class="share-view__file-icon">📄</div>
          <h2 class="share-view__file-name">{{ shareInfo.entryName }}</h2>
          <div class="share-view__file-actions">
            <a
              :href="filePreviewUrl"
              target="_blank"
              class="button button--primary"
              data-testid="share-file-preview"
            >
              预览文件
            </a>
            <a
              v-if="canDownload"
              :href="fileDownloadUrl"
              class="button"
              data-testid="share-file-download"
            >
              下载文件
            </a>
          </div>
        </div>
      </div>

      <div v-else class="share-view__directory">
        <div v-if="browseError" class="share-view__error-box">
          <p class="share-view__error">{{ browseError }}</p>
        </div>

        <div v-else-if="items.length === 0 && !browsing" class="share-view__empty">
          <p class="muted">此文件夹为空</p>
        </div>

        <table v-else class="share-view__table" data-testid="share-items-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>大小</th>
              <th>修改时间</th>
              <th v-if="canDownload">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" :data-testid="`share-item-${item.id}`">
              <td>
                <button
                  v-if="item.kind === 'dir'"
                  class="share-view__item-btn"
                  type="button"
                  :data-testid="`share-open-${item.id}`"
                  @click="openDirectory(item)"
                >
                  📁 {{ item.name }}
                </button>
                <a
                  v-else
                  :href="item.previewUrl"
                  target="_blank"
                  class="share-view__item-link"
                  :data-testid="`share-preview-${item.id}`"
                >
                  📄 {{ item.name }}
                </a>
              </td>
              <td>{{ item.kind === "dir" ? "-" : formatSize(item.size) }}</td>
              <td>{{ formatDate(item.updatedAt) }}</td>
              <td v-if="canDownload">
                <a
                  v-if="item.kind === 'file'"
                  :href="item.downloadUrl"
                  class="button button--sm"
                  :data-testid="`share-download-${item.id}`"
                  @click.stop
                >
                  下载
                </a>
                <a
                  v-else
                  :href="item.archiveUrl"
                  class="button button--sm"
                  :data-testid="`share-archive-${item.id}`"
                  @click.stop
                >
                  打包下载
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { api, ApiError, shareFilePreviewUrl, shareFileDownloadUrl, type ShareFileItem, type ShareInfo } from "@/api/client";

const route = useRoute();
const token = computed(() => String(route.params.token || ""));

const shareInfo = ref<ShareInfo | null>(null);
const verified = ref(false);
const accessCode = ref("");
const verifying = ref(false);
const verifyError = ref("");
const loadError = ref("");

const currentPath = ref("");
const items = ref<ShareFileItem[]>([]);
const browsing = ref(false);
const browseError = ref("");

const permissionLabel = computed(() => {
  if (!shareInfo.value) return "";
  return shareInfo.value.permission === "view" ? "仅查看" : "允许下载";
});

const canDownload = computed(() => shareInfo.value?.permission === "download");

const breadcrumbs = computed(() => {
  if (!currentPath.value) return [];
  const segments = currentPath.value.split("/").filter(Boolean);
  return segments.map((segment, index) => {
    const path = "/" + segments.slice(0, index + 1).join("/");
    return {
      label: segment,
      path,
      isCurrent: index === segments.length - 1,
    };
  });
});

const filePreviewUrl = computed(() => {
  if (!shareInfo.value || shareInfo.value.entryKind !== "file") return "";
  return shareFilePreviewUrl(token.value, shareInfo.value.entryId);
});

const fileDownloadUrl = computed(() => {
  if (!shareInfo.value || shareInfo.value.entryKind !== "file") return "";
  return shareFileDownloadUrl(token.value, shareInfo.value.entryId);
});

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(isoString: string): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleDateString("zh-CN");
}

async function loadShareInfo() {
  loadError.value = "";
  try {
    const response = await api.shareInfo(token.value);
    shareInfo.value = response.info;

    if (!shareInfo.value.requiresAccessCode) {
      verified.value = true;
      if (shareInfo.value.entryKind === "dir") {
        await browse("");
      }
    }
  } catch (error) {
    loadError.value = error instanceof ApiError ? error.message : "加载分享信息失败";
  }
}

async function handleVerify() {
  verifyError.value = "";
  verifying.value = true;
  try {
    await api.verifyShareAccessCode(token.value, accessCode.value.trim());
    verified.value = true;
    if (shareInfo.value?.entryKind === "dir") {
      await browse("");
    }
  } catch (error) {
    verifyError.value = error instanceof ApiError ? error.message : "安全码验证失败";
  } finally {
    verifying.value = false;
  }
}

async function browse(path: string) {
  browsing.value = true;
  browseError.value = "";
  try {
    const response = await api.shareBrowse(token.value, path);
    items.value = response.items;
    currentPath.value = response.path;
  } catch (error) {
    browseError.value = error instanceof ApiError ? error.message : "加载文件夹失败";
  } finally {
    browsing.value = false;
  }
}

function navigateToPath(path: string) {
  browse(path);
}

function openDirectory(item: ShareFileItem) {
  const newPath = currentPath.value ? `${currentPath.value}/${item.name}` : `/${item.name}`;
  browse(newPath);
}

onMounted(() => {
  loadShareInfo();
});
</script>

<style scoped>
.share-view {
  min-height: 100vh;
  background: var(--color-background);
}

.share-view__verify {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
}

.share-view__verify-card {
  max-width: 480px;
  width: 100%;
  padding: 2rem;
  background: var(--color-background-soft);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.share-view__title {
  margin: 0 0 1.5rem;
  font-size: 1.5rem;
  text-align: center;
}

.share-view__info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--color-background);
  border-radius: 4px;
}

.share-view__icon {
  font-size: 3rem;
}

.share-view__entry-name {
  margin: 0;
  font-size: 1.25rem;
  text-align: center;
  word-break: break-word;
}

.share-view__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.share-view__error {
  color: var(--color-error);
  margin: 0;
  text-align: center;
}

.share-view__error-box {
  padding: 1rem;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.share-view__content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.share-view__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.share-view__breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.share-view__breadcrumb-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem 0.5rem;
}

.share-view__breadcrumb-btn:hover {
  text-decoration: underline;
}

.share-view__breadcrumb-sep {
  color: var(--color-text-muted);
}

.share-view__breadcrumb-current {
  color: var(--color-text);
  font-weight: 500;
}

.share-view__meta {
  display: flex;
  gap: 1rem;
}

.share-view__permission {
  padding: 0.25rem 0.75rem;
  background: var(--color-background-soft);
  border-radius: 4px;
  font-size: 0.875rem;
}

.share-view__file-preview {
  margin-top: 2rem;
}

.share-view__file-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 3rem;
  background: var(--color-background-soft);
  border-radius: 8px;
}

.share-view__file-icon {
  font-size: 4rem;
}

.share-view__file-name {
  margin: 0;
  font-size: 1.5rem;
  text-align: center;
  word-break: break-word;
}

.share-view__file-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.share-view__directory {
  margin-top: 1rem;
}

.share-view__empty {
  padding: 3rem;
  text-align: center;
}

.share-view__table {
  width: 100%;
  border-collapse: collapse;
}

.share-view__table th,
.share-view__table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.share-view__table th {
  font-weight: 600;
  background: var(--color-background-soft);
}

.share-view__item-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 1rem;
  text-align: left;
  padding: 0;
}

.share-view__item-btn:hover {
  text-decoration: underline;
}

.share-view__item-link {
  color: var(--color-primary);
  text-decoration: none;
}

.share-view__item-link:hover {
  text-decoration: underline;
}
</style>

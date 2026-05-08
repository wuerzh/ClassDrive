<template>
  <section class="classes-page settings-page">
    <section class="settings-page__shell">
      <nav class="settings-page__compact-nav" aria-label="设置入口" data-testid="settings-compact-nav">
        <RouterLink
          class="button"
          :class="{ 'button--primary': isOverviewActive }"
          to="/settings"
          data-testid="settings-nav-overview"
        >
          概览
        </RouterLink>
        <RouterLink
          class="button"
          :class="{ 'button--primary': route.name === 'settings-profile' }"
          to="/settings/profile"
          data-testid="settings-nav-profile"
        >
          个人设置
        </RouterLink>
        <RouterLink
          v-if="isOwner"
          class="button"
          :class="{ 'button--primary': route.name === 'settings-system' }"
          to="/settings/system"
          data-testid="settings-nav-system"
        >
          系统设置
        </RouterLink>
        <RouterLink
          v-if="isOwner"
          class="button"
          :class="{ 'button--primary': route.name === 'settings-teachers' || route.name === 'settings-teacher-detail' }"
          to="/settings/teachers"
          data-testid="settings-nav-teachers"
        >
          老师账号
        </RouterLink>
        <RouterLink
          v-if="isOwner"
          class="button"
          :class="{ 'button--primary': route.name === 'settings-logs' }"
          to="/settings/logs"
          data-testid="settings-nav-logs"
        >
          日志审计
        </RouterLink>
      </nav>

      <section class="settings-page__account-strip" data-testid="settings-account-strip">
        <div class="settings-page__account-main">
          <strong class="settings-page__identity" data-testid="settings-account-identity">
            当前账号：{{ authStore.user?.displayName || "未登录" }}（{{ authStore.user?.username || "未登录" }}）
          </strong>
          <StatusPill :label="roleLabel" tone="status-pill--accent" />
        </div>
        <button
          class="settings-page__portal-link"
          type="button"
          data-testid="settings-portal-link"
          @click="copyPortalUrl"
        >
          {{ portalUrl }}
        </button>
      </section>

      <template v-if="isOverviewActive">
        <section class="settings-page__entry-list" data-testid="settings-entry-list">
          <RouterLink class="settings-page__route-card" to="/settings/profile" data-testid="settings-route-card-profile">
            <span>
              <strong>个人设置</strong>
              <small>展示名称、登录密码</small>
            </span>
            <span class="settings-page__route-arrow">进入</span>
          </RouterLink>
          <RouterLink
            v-if="isOwner"
            class="settings-page__route-card"
            to="/settings/system"
            data-testid="settings-route-card-system"
          >
            <span>
              <strong>系统设置</strong>
              <small>访问端口、入口地址</small>
            </span>
            <span class="settings-page__route-arrow">进入</span>
          </RouterLink>
          <RouterLink
            v-if="isOwner"
            class="settings-page__route-card"
            to="/settings/teachers"
            data-testid="settings-route-card-teachers"
          >
            <span>
              <strong>老师账号</strong>
              <small>账号、角色、状态</small>
            </span>
            <span class="settings-page__route-arrow">进入</span>
          </RouterLink>
          <RouterLink
            v-if="isOwner"
            class="settings-page__route-card"
            to="/settings/logs"
            data-testid="settings-route-card-logs"
          >
            <span>
              <strong>日志审计</strong>
              <small>登录记录、操作记录</small>
            </span>
            <span class="settings-page__route-arrow">进入</span>
          </RouterLink>
        </section>
      </template>

      <RouterView v-else />
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import StatusPill from "@/components/StatusPill.vue";
import { useAuthStore } from "@/stores/auth";
import { useSystemSettingsStore } from "@/stores/system-settings";
import { useToastStore } from "@/stores/toast";
import { formatAccessUrl } from "@/utils/access-url";
import { teacherRoleLabel } from "@/utils/ui-copy";

const authStore = useAuthStore();
const systemSettingsStore = useSystemSettingsStore();
const toastStore = useToastStore();
const route = useRoute();

const isOwner = computed(() => authStore.user?.role === "owner");
const isOverviewActive = computed(() => route.name === "settings" || route.path === "/settings");
const portalUrl = computed(() => {
  const settings = systemSettingsStore.settings;
  if (settings?.serverHost && settings.serverPort) {
    return formatAccessUrl(settings.serverHost, settings.serverPort);
  }
  return `${window.location.origin}/`;
});
const roleLabel = computed(() => teacherRoleLabel(authStore.user?.role));

async function copyPortalUrl() {
  const copied = await copyTextToClipboard(portalUrl.value);
  toastStore.push(copied ? "success" : "error", copied ? "访问地址已复制" : "复制失败，请手动复制地址");
}

async function copyTextToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Clipboard API can be blocked on non-secure IP origins; fall through to the selection fallback.
  }
  return copyTextWithSelectionFallback(value);
}

function copyTextWithSelectionFallback(value: string): boolean {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") {
    return false;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

onMounted(() => {
  if (isOwner.value) {
    void systemSettingsStore.load();
  }
});
</script>

<style scoped>
.settings-page__shell {
  display: grid;
  gap: 12px;
}

.settings-page__compact-nav {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 4px;
  border: 1px solid var(--border-soft);
  border-radius: 18px;
  background: var(--bg-surface);
}

.settings-page__account-strip {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border-soft);
  border-radius: 20px;
  background: var(--bg-surface);
  box-shadow: var(--shadow-soft);
}

.settings-page__account-main {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.settings-page__identity,
.settings-page__route-card strong {
  color: var(--text-primary);
}

.settings-page__identity {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-page__entry-list {
  display: grid;
  gap: 8px;
}

.settings-page__route-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border-soft);
  border-radius: 18px;
  background: var(--bg-surface);
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.settings-page__route-card:hover {
  transform: translateY(-1px);
  border-color: var(--border-strong);
  background: var(--bg-subtle);
}

.settings-page__route-card small {
  display: block;
  margin-top: 4px;
  color: var(--text-muted);
}

.settings-page__route-arrow {
  color: var(--accent-link);
  font-size: 0.86rem;
  font-weight: 700;
}

.settings-page__portal-link {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 14px;
  background: var(--bg-subtle);
  color: var(--accent-link);
  border: 1px solid var(--border-soft);
  font-weight: 700;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
}

@media (max-width: 720px) {
  .settings-page__account-strip {
    flex-direction: column;
    align-items: stretch;
  }

  .settings-page__account-main {
    flex-wrap: wrap;
  }

  .settings-page__portal-link {
    white-space: normal;
    word-break: break-all;
  }
}
</style>

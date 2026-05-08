<template>
  <SettingsPanelSection
    label="系统设置"
    description="维护老师端访问入口；端口保存后会立即启用新访问地址。"
    panel-test-id="system-settings-panel"
    guide-test-id="system-settings-guide"
  >
    <p v-if="!isOwner" class="muted">当前账号无权访问系统设置。</p>

    <div v-else class="settings-form">
      <section class="settings-access-card">
        <div>
          <strong>当前访问地址</strong>
          <p class="settings-access-card__url" data-testid="system-access-url">{{ accessUrl }}</p>
          <p class="muted" data-testid="system-port-note">端口保存到本机配置；保存后立即生效。</p>
        </div>

        <label class="app-field settings-access-card__field">
          <span>访问端口</span>
          <input
            v-model="serverPort"
            class="copy-dialog__search"
            type="text"
            inputmode="numeric"
            data-testid="system-port-input"
          />
        </label>
      </section>

      <section class="settings-security-card" data-testid="system-security-card">
        <div>
          <strong>登录安全</strong>
          <p class="muted">开启后，同一老师或学生账号新登录会立即踢掉旧登录。</p>
        </div>
        <label class="settings-switch">
          <input
            v-model="singleAccountLoginEnabled"
            type="checkbox"
            data-testid="system-single-account-login"
          />
          <span>避免一个账号多处同时登录</span>
        </label>
      </section>

      <p v-if="formError" class="form-error" data-testid="system-settings-error">{{ formError }}</p>

      <div class="settings-actions">
        <button class="button button--primary" type="button" data-testid="system-settings-save" @click="saveSettings">
          保存系统设置
        </button>
      </div>
    </div>
  </SettingsPanelSection>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import SettingsPanelSection from "@/components/SettingsPanelSection.vue";
import { ApiError } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { useSystemSettingsStore } from "@/stores/system-settings";
import { useToastStore } from "@/stores/toast";
import { formatAccessUrl } from "@/utils/access-url";

const authStore = useAuthStore();
const systemSettingsStore = useSystemSettingsStore();
const toastStore = useToastStore();

const isOwner = computed(() => authStore.user?.role === "owner");
const serverPort = ref("80");
const singleAccountLoginEnabled = ref(true);
const formError = ref("");

const accessUrl = computed(() => {
  const settings = systemSettingsStore.settings;
  const host = settings?.serverHost || window.location.hostname || "127.0.0.1";
  const port = serverPort.value.trim() || settings?.serverPort || "80";
  return formatAccessUrl(host, port);
});

function syncFormFromStore() {
  serverPort.value = systemSettingsStore.settings?.serverPort || "80";
  singleAccountLoginEnabled.value = systemSettingsStore.settings?.singleAccountLoginEnabled ?? true;
}

function validatePort(value: string) {
  const trimmed = value.trim();
  const parsed = Number(trimmed);
  if (!/^\d+$/.test(trimmed) || !Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return "端口必须为 1-65535 的数字";
  }
  return "";
}

async function loadSettings() {
  if (!isOwner.value) {
    return;
  }
  try {
    await systemSettingsStore.load(true);
    syncFormFromStore();
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "加载系统设置失败");
  }
}

async function saveSettings() {
  formError.value = validatePort(serverPort.value);
  if (formError.value) {
    return;
  }
  try {
    await systemSettingsStore.save({
      uploadPanelEnabled: systemSettingsStore.settings?.uploadPanelEnabled ?? true,
      singleAccountLoginEnabled: singleAccountLoginEnabled.value,
      serverPort: serverPort.value.trim(),
    });
    syncFormFromStore();
    toastStore.push("success", "系统设置已保存，端口已立即生效");
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "保存系统设置失败");
  }
}

onMounted(() => {
  void loadSettings();
});
</script>

<style scoped>
.settings-form {
  display: grid;
  gap: 16px;
  margin-top: 12px;
}

.settings-access-card,
.settings-security-card {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border: 1px solid var(--border-soft);
  border-radius: 20px;
  background: var(--bg-subtle);
}

.settings-security-card {
  align-items: center;
}

.settings-access-card__url {
  margin: 6px 0 2px;
  color: var(--accent-link);
  font-weight: 700;
  word-break: break-all;
}

.settings-access-card__field {
  flex: 0 1 220px;
}

.settings-actions {
  display: flex;
  gap: 8px;
}

.settings-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  font-weight: 700;
}

.settings-switch input {
  width: 18px;
  height: 18px;
}
</style>

<template>
  <SettingsPanelSection
    label="个人设置"
    description="维护展示名称。"
    panel-test-id="profile-base-panel"
    guide-test-id="profile-base-guide"
  >
    <div class="settings-form">
      <div class="app-field-grid app-field-grid--single">
        <label class="app-field">
          <span>展示名称</span>
          <input
            v-model="displayName"
            class="copy-dialog__search"
            type="text"
            data-testid="profile-display-name"
          />
        </label>
      </div>

      <div class="settings-actions">
        <button class="button button--primary" type="button" data-testid="profile-save" @click="saveProfile">
          保存个人设置
        </button>
      </div>
    </div>
  </SettingsPanelSection>

  <SettingsPanelSection
    label="修改密码"
    description="单独更新登录密码。"
    panel-test-id="profile-password-panel"
    guide-test-id="profile-password-guide"
  >
    <div class="settings-form">
      <div class="app-field-grid app-field-grid--password">
        <label class="app-field">
          <span>当前密码</span>
          <input
            v-model="currentPassword"
            class="copy-dialog__search"
            type="password"
            data-testid="password-current"
          />
        </label>

        <label class="app-field">
          <span>新密码</span>
          <input
            v-model="nextPassword"
            class="copy-dialog__search"
            type="password"
            data-testid="password-next"
          />
        </label>

        <label class="app-field">
          <span>确认新密码</span>
          <input
            v-model="confirmPassword"
            class="copy-dialog__search"
            type="password"
            data-testid="password-confirm"
          />
          <small v-if="passwordError" class="form-error" data-testid="password-confirm-error">{{ passwordError }}</small>
        </label>
      </div>

      <div class="settings-actions">
        <button class="button button--primary" type="button" data-testid="password-save" @click="savePassword">
          更新密码
        </button>
      </div>
    </div>
  </SettingsPanelSection>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import SettingsPanelSection from "@/components/SettingsPanelSection.vue";
import { ApiError } from "@/api/client";
import { useTeacherProfileStore } from "@/stores/teacher-profile";
import { useToastStore } from "@/stores/toast";
import { getPasswordComplexityError } from "@/utils/password-strength";

const teacherProfileStore = useTeacherProfileStore();
const toastStore = useToastStore();

const displayName = ref("");
const currentPassword = ref("");
const nextPassword = ref("");
const confirmPassword = ref("");
const passwordError = ref("");

async function loadProfile() {
  const profile = await teacherProfileStore.load();
  if (!profile) {
    return;
  }
  displayName.value = profile.displayName;
}

async function saveProfile() {
  try {
    const profile = await teacherProfileStore.save({
      displayName: displayName.value.trim(),
      preferences: {
        compactListEnabled: true,
      },
    });
    if (profile) {
      displayName.value = profile.displayName;
    }
    toastStore.push("success", "个人设置已保存");
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "保存个人设置失败");
  }
}

async function savePassword() {
  passwordError.value = "";
  if (nextPassword.value !== confirmPassword.value) {
    passwordError.value = "两次输入的新密码不一致";
    return;
  }
  const passwordComplexityError = getPasswordComplexityError(nextPassword.value);
  if (passwordComplexityError) {
    passwordError.value = passwordComplexityError;
    return;
  }
  try {
    await teacherProfileStore.updatePassword({
      currentPassword: currentPassword.value,
      newPassword: nextPassword.value,
    });
    currentPassword.value = "";
    nextPassword.value = "";
    confirmPassword.value = "";
    toastStore.push("success", "密码已更新");
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "更新密码失败");
  }
}

onMounted(async () => {
  try {
    await loadProfile();
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "加载个人设置失败");
  }
});
</script>

<style scoped>
.settings-form {
  display: grid;
  gap: 16px;
  margin-top: 12px;
}

.app-field-grid--single {
  grid-template-columns: minmax(0, 1fr);
}

.app-field-grid--password {
  grid-template-columns: minmax(220px, 360px);
}

.settings-actions {
  display: flex;
  gap: 8px;
}
</style>

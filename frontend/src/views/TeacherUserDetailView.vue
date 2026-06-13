<template>
  <SettingsPanelSection
    label="老师账号详情"
    description="先看当前账号身份与状态，再在下方表单里维护角色、停用状态和密码。"
    panel-test-id="teacher-detail-summary-panel"
    guide-test-id="teacher-detail-summary-intro"
  >
    <InfoList :items="teacherSummaryItems" layout="grid" test-id="teacher-detail-info-list" />
  </SettingsPanelSection>

  <SettingsPanelSection
    label="维护信息"
    description="展示名称、角色和停用状态会立即影响老师端使用权限；密码留空则不改。"
    panel-test-id="teacher-detail-form-panel"
    guide-test-id="teacher-detail-form-intro"
  >
    <div class="settings-form">
      <div class="app-field-grid">
        <label class="app-field">
          <span>展示名称</span>
          <input v-model="displayName" class="copy-dialog__search" type="text" data-testid="teacher-detail-display-name" />
        </label>

        <label class="app-field">
          <span>账号角色</span>
          <select v-model="role" class="copy-dialog__search" data-testid="teacher-detail-role">
            <option value="staff">{{ teacherRoleLabel("staff") }}</option>
            <option value="owner">{{ teacherRoleLabel("owner") }}</option>
          </select>
        </label>

        <label class="app-field app-field--checkbox app-checkbox-card">
          <input v-model="disabled" type="checkbox" data-testid="teacher-detail-disabled" />
          <div>
            <strong>{{ teacherStateLabel(disabled) }}</strong>
            <p class="muted">停用后该老师不能继续登录老师端。</p>
          </div>
        </label>

        <label class="app-field">
          <span>重置密码（可留空）</span>
          <input v-model="password" class="copy-dialog__search" type="password" data-testid="teacher-detail-password" />
        </label>
      </div>

      <div class="settings-actions">
        <button class="button button--primary" type="button" data-testid="teacher-detail-save" @click="saveTeacher">
          保存老师账号
        </button>
      </div>
    </div>
  </SettingsPanelSection>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import InfoList from "@/components/InfoList.vue";
import SettingsPanelSection from "@/components/SettingsPanelSection.vue";
import { ApiError } from "@/api/client";
import { useTeacherUsersStore } from "@/stores/teacher-users";
import { useToastStore } from "@/stores/toast";
import type { StatusPillTone } from "@/types/status-pill";
import { teacherRoleLabel, teacherStateLabel } from "@/utils/ui-copy";

const props = defineProps<{
  teacherId?: number;
}>();

const route = useRoute();
const toastStore = useToastStore();
const teacherUsersStore = useTeacherUsersStore();
const { currentTeacher: teacher } = storeToRefs(teacherUsersStore);

const displayName = ref("");
const role = ref<"owner" | "staff">("staff");
const disabled = ref(false);
const password = ref("");

const teacherSummaryItems = computed<Array<{ label: string; value: string; tone?: StatusPillTone }>>(() => [
  { label: "登录账号", value: teacher.value?.username || "加载中" },
  { label: "当前角色", value: teacherRoleLabel(role.value), tone: "status-pill--accent" },
  {
    label: "账号状态",
    value: teacherStateLabel(disabled.value),
    tone: disabled.value ? "status-pill--danger" : "status-pill--success",
  },
]);

const effectiveTeacherId = computed(() => props.teacherId ?? Number(route.params.teacherId));

async function loadTeacher() {
  if (!Number.isFinite(effectiveTeacherId.value) || effectiveTeacherId.value <= 0) {
    return;
  }
  const current = await teacherUsersStore.loadTeacher(effectiveTeacherId.value, true);
  if (!current) {
    return;
  }
  displayName.value = current.displayName;
  role.value = current.role;
  disabled.value = current.disabled;
}

async function saveTeacher() {
  if (!Number.isFinite(effectiveTeacherId.value) || effectiveTeacherId.value <= 0) {
    toastStore.push("error", "老师账号不存在");
    return;
  }

  try {
    const current = await teacherUsersStore.saveTeacher(effectiveTeacherId.value, {
      displayName: displayName.value.trim(),
      role: role.value,
      disabled: disabled.value,
      ...(password.value.trim() ? { password: password.value } : {}),
    });
    if (current) {
      displayName.value = current.displayName;
      role.value = current.role;
      disabled.value = current.disabled;
    }
    password.value = "";
    toastStore.push("success", "老师账号已更新");
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "更新老师账号失败");
  }
}

watch(
  effectiveTeacherId,
  async () => {
    try {
      await loadTeacher();
    } catch (error) {
      toastStore.push("error", error instanceof ApiError ? error.message : "加载老师账号失败");
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.settings-form {
  display: grid;
  gap: 16px;
  margin-top: 12px;
}

.settings-actions {
  display: flex;
  gap: 8px;
}
</style>

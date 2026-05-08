<template>
  <ElConfigProvider :locale="zhCn">
    <UploadBar :enabled="systemSettings?.uploadPanelEnabled ?? true" />
    <ToastStack />
    <RouterView />
  </ElConfigProvider>
</template>

<script setup lang="ts">
import { ElConfigProvider } from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import { storeToRefs } from "pinia";
import { onMounted, watch } from "vue";
import { RouterView } from "vue-router";
import UploadBar from "@/components/UploadBar.vue";
import ToastStack from "@/components/ToastStack.vue";
import { useAuthStore } from "@/stores/auth";
import { useAssignmentDetailStore } from "@/stores/assignment-detail";
import { useAssignmentsStore } from "@/stores/assignments";
import { useClassesStore } from "@/stores/classes";
import { useRecentCopyTargetsStore } from "@/stores/recent-copy-targets";
import { useStudentsStore } from "@/stores/students";
import { useSystemSettingsStore } from "@/stores/system-settings";
import { useTeacherProfileStore } from "@/stores/teacher-profile";
import { useTeacherUsersStore } from "@/stores/teacher-users";
import { initializeTheme } from "@/utils/theme";

const authStore = useAuthStore();
const assignmentDetailStore = useAssignmentDetailStore();
const assignmentsStore = useAssignmentsStore();
const classesStore = useClassesStore();
const recentCopyTargetsStore = useRecentCopyTargetsStore();
const studentsStore = useStudentsStore();
const systemSettingsStore = useSystemSettingsStore();
const teacherProfileStore = useTeacherProfileStore();
const teacherUsersStore = useTeacherUsersStore();
const { settings: systemSettings } = storeToRefs(systemSettingsStore);

onMounted(() => {
  initializeTheme();
});

watch(
  () => authStore.user?.id ?? 0,
  async (teacherId, previousTeacherId) => {
    if (!teacherId) {
      assignmentDetailStore.clear();
      assignmentsStore.clear();
      classesStore.clear();
      teacherProfileStore.clear();
      teacherUsersStore.clear();
      recentCopyTargetsStore.clear();
      studentsStore.clear();
      systemSettingsStore.clear();
      return;
    }
    if (previousTeacherId && previousTeacherId !== teacherId) {
      assignmentDetailStore.clear();
      assignmentsStore.clear();
      classesStore.clear();
      teacherProfileStore.clear();
      teacherUsersStore.clear();
      recentCopyTargetsStore.clear();
      studentsStore.clear();
    }
    try {
      await systemSettingsStore.load(true);
    } catch {
      systemSettingsStore.clear();
    }
  },
  { immediate: true },
);
</script>

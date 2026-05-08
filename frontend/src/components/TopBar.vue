<template>
  <header class="topbar">
    <div class="topbar__context-block">
      <RouterLink
        v-if="topbarBackTarget"
        class="button button--ghost topbar__back-button"
        :to="topbarBackTarget"
        data-testid="topbar-back"
        aria-label="返回列表"
      >
        ↩
      </RouterLink>
      <div class="topbar__context" data-testid="topbar-context">{{ title }}</div>
      <select
        v-if="showFilesClassSelect"
        v-model.number="selectedClassId"
        class="topbar__class-select"
        data-testid="files-class-select"
        aria-label="切换班级资料"
        @change="changeFilesClass"
      >
        <option v-for="item in classes" :key="item.id" :value="item.id">
          {{ item.name }}
        </option>
      </select>
    </div>
    <div class="topbar__actions">
      <span class="topbar__user">{{ authStore.user?.displayName }}</span>
      <button
        class="button button--ghost topbar__theme-toggle"
        type="button"
        data-testid="theme-toggle"
        @click="toggleTheme"
      >
        {{ currentTheme === "dark" ? "浅色" : "深色" }}
      </button>
      <button class="button button--ghost" type="button" @click="handleLogout">退出</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import { isNavigationFailure, RouterLink, useRoute, useRouter, type LocationQueryRaw } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useClassesStore } from "@/stores/classes";
import { useTheme } from "@/utils/theme";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const classesStore = useClassesStore();
const { classes } = storeToRefs(classesStore);
const { currentTheme, toggleTheme } = useTheme();

const title = computed(() => String(route.meta.title ?? "工作台"));
const showFilesClassSelect = computed(() => route.name === "files-class" || route.path.startsWith("/files/classes/"));
const topbarBackTarget = computed(() => {
  if (route.name !== "assignment-detail") {
    return "";
  }
  const classId = parseRouteClassId();
  return classId > 0 ? `/assignments/classes/${classId}` : "/assignments";
});
const selectedClassId = ref(parseRouteClassId());

function parseRouteClassId(): number {
  const raw = Array.isArray(route.params.classId) ? route.params.classId[0] : route.params.classId;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

async function ensureFilesClassesLoaded(): Promise<void> {
  if (!showFilesClassSelect.value || classes.value.length > 0) {
    return;
  }
  await classesStore.load();
}

async function changeFilesClass(): Promise<void> {
  if (!selectedClassId.value) {
    return;
  }
  const query: LocationQueryRaw = { ...route.query };
  delete query.page;
  const result = await router.push({
    path: `/files/classes/${selectedClassId.value}`,
    query,
  });
  if (isNavigationFailure(result)) {
    selectedClassId.value = parseRouteClassId();
  }
}

async function handleLogout() {
  await authStore.logout();
  await router.push("/login");
}

watch(
  () => route.params.classId,
  () => {
    selectedClassId.value = parseRouteClassId();
  },
  { immediate: true },
);

watch(
  showFilesClassSelect,
  () => {
    void ensureFilesClassesLoaded();
  },
  { immediate: true },
);
</script>

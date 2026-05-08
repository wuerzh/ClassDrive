<template>
  <div class="shell">
    <SidebarNav />
    <section class="shell__content">
      <TopBar />
      <main class="shell__main">
        <div class="shell__workspace">
          <RouterView />
        </div>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView } from "vue-router";
import SidebarNav from "@/components/SidebarNav.vue";
import TopBar from "@/components/TopBar.vue";
import { useShellStore } from "@/stores/shell";

const shellStore = useShellStore();

onMounted(async () => {
  if (!shellStore.ready) {
    await shellStore.load();
  }
});
</script>

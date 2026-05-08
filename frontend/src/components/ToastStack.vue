<template>
  <div class="toast-stack">
    <div
      v-for="item in toastStore.items"
      :key="item.id"
      class="toast"
      :class="`toast--${item.tone}`"
    >
      {{ item.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from "@/stores/toast";

const toastStore = useToastStore();
</script>

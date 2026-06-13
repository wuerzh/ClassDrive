<template>
  <span class="status-pill" :class="tone" role="status">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import type { StatusPillTone } from "@/types/status-pill";

defineProps<{
  label: string;
  tone: StatusPillTone;
}>();
</script>

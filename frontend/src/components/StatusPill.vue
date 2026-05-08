<template>
  <span class="status-pill" :class="tone">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  tone: string;
}>();
</script>

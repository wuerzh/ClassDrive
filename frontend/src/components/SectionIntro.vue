<template>
  <section class="section-intro" :data-testid="testId">
    <div class="section-intro__label">{{ label }}</div>
    <p v-if="description" class="section-intro__description">{{ description }}</p>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label: string;
  description?: string;
  testId?: string;
}>(), {
  description: "",
  testId: "section-intro",
});
</script>

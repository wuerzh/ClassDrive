<template>
  <section class="guide-section" :data-testid="testId">
    <header class="guide-section__header">
      <div class="guide-section__label">{{ label }}</div>
    </header>
    <div class="guide-section__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label: string;
  testId?: string;
}>(), {
  testId: "guide-section",
});
</script>

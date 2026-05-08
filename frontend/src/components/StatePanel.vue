<template>
  <div :data-testid="testId">
    <h3 v-if="title" class="classes-card__title">{{ title }}</h3>
    <p :class="toneClass">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{
  title?: string;
  message: string;
  tone?: "info" | "error";
  testId?: string;
}>(), {
  title: "",
  tone: "info",
  testId: "state-panel",
});

const toneClass = computed(() => (props.tone === "error" ? "form-error" : "muted"));
</script>

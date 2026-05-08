<template>
  <section class="settings-page__panel" :data-testid="panelTestId">
    <GuideSection :label="label" :test-id="guideTestId">
      <p v-if="description" class="muted">{{ description }}</p>
      <slot />
    </GuideSection>
  </section>
</template>

<script setup lang="ts">
import GuideSection from "@/components/GuideSection.vue";

withDefaults(defineProps<{
  label: string;
  description?: string;
  panelTestId?: string;
  guideTestId?: string;
}>(), {
  description: "",
  panelTestId: "settings-panel-section",
  guideTestId: "settings-panel-guide",
});
</script>

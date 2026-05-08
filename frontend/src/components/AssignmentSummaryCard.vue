<template>
  <article class="classes-card assignment-summary-card" :data-testid="testId">
    <div class="assignment-summary-card__main">
      <h3 class="assignment-summary-card__title">{{ title }}</h3>
      <p class="assignment-summary-card__description">{{ description }}</p>
      <ul class="assignment-summary-card__details" :data-testid="detailsTestId">
        <li v-for="item in details" :key="item.label" class="assignment-summary-card__detail">
          <span class="assignment-summary-card__detail-label">{{ item.label }}</span>
          <StatusPill v-if="item.tone" :label="item.value" :tone="item.tone" />
          <span v-else class="assignment-summary-card__detail-value">{{ item.value }}</span>
        </li>
      </ul>
    </div>
    <div v-if="$slots.action" class="assignment-summary-card__action">
      <slot name="action" />
    </div>
  </article>
</template>

<script setup lang="ts">
import StatusPill from "@/components/StatusPill.vue";

defineProps<{
  title: string;
  description: string;
  details: Array<{
    label: string;
    value: string;
    tone?: string;
  }>;
  testId?: string;
  detailsTestId?: string;
}>();
</script>

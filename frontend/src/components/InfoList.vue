<template>
  <div :data-testid="testId">
    <dl v-if="layout === 'grid'" class="app-summary-grid">
      <div v-for="item in items" :key="item.label">
        <dt>{{ item.label }}</dt>
        <dd>
          <StatusPill v-if="item.tone" :label="item.value" :tone="item.tone" />
          <span v-else>{{ item.value }}</span>
        </dd>
      </div>
    </dl>

    <div v-else class="info-list">
      <p v-for="item in items" :key="item.label" class="muted">
        {{ item.label }}：
        <StatusPill v-if="item.tone" :label="item.value" :tone="item.tone" />
        <template v-else>{{ item.value }}</template>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import StatusPill from "@/components/StatusPill.vue";
import type { StatusPillTone } from "@/types/status-pill";

defineProps<{
  items: Array<{
    label: string;
    value: string;
    tone?: StatusPillTone;
  }>;
  layout?: "stacked" | "grid";
  testId?: string;
}>();
</script>

<style scoped>
.info-list {
  display: grid;
  gap: 8px;
}

.info-list p {
  margin: 0;
}
</style>

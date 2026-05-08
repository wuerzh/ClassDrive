<template>
  <div class="explanation-card-list" :class="`explanation-card-list--${variant}`" :data-testid="testId">
    <article
      v-for="item in items"
      :key="item.id"
      class="classes-card explanation-card-list__item"
      :class="{ 'explanation-card-list__item--subtle': variant === 'subtle' }"
      :data-testid="resolveItemTestId(item.id)"
    >
      <div>
        <h3 class="classes-card__title">{{ item.title }}</h3>
        <p class="muted">{{ item.description }}</p>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  items: Array<{
    id: string | number;
    title: string;
    description: string;
  }>;
  variant?: "default" | "subtle";
  testId?: string;
  itemTestIdPrefix?: string;
}>(), {
  variant: "default",
  testId: "explanation-card-list",
  itemTestIdPrefix: "",
});

function resolveItemTestId(id: string | number) {
  return props.itemTestIdPrefix ? `${props.itemTestIdPrefix}-${id}` : undefined;
}
</script>

<style scoped>
.explanation-card-list {
  display: grid;
  gap: 12px;
}

.explanation-card-list__item p {
  margin: 0;
}

.explanation-card-list__item--subtle {
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid var(--border-soft);
  background: var(--bg-subtle);
}
</style>

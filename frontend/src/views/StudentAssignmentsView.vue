<template>
  <section class="classes-page">
    <section class="classes-page__board student-assignments-workspace" data-testid="student-assignments-workspace">
      <StatePanel v-if="loading" message="正在加载作业..." test-id="student-assignments-loading" />
      <StatePanel v-else-if="errorText" :message="errorText" tone="error" test-id="student-assignments-error" />
      <template v-else>
        <PaginationControls
          :page="assignmentPage"
          :page-size="assignmentPageSize"
          :page-size-options="assignmentPageSizeOptions"
          :total="totalAssignments"
          :total-pages="totalAssignmentPages"
          test-id-prefix="student-assignment"
          @update:page-size="updateAssignmentPageSize"
          @prev="goPrevAssignmentPage"
          @next="goNextAssignmentPage"
        />
        <div
          v-if="assignments.length"
          class="student-assignments-table-wrap"
        >
          <table class="files-table student-assignments-table" data-testid="student-assignments-table">
            <thead>
              <tr>
                <th>作业</th>
                <th>发布时间</th>
                <th>截止时间</th>
                <th>提交状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="assignment in visibleAssignments"
                :key="assignment.id"
                class="student-assignment-row student-assignment-row--clickable"
                role="link"
                tabindex="0"
                :data-testid="`student-assignment-row-${assignment.id}`"
                :aria-label="`查看作业：${assignment.title}`"
                @click="openAssignment(assignment.id)"
                @keydown.enter.prevent="openAssignment(assignment.id)"
                @keydown.space.prevent="openAssignment(assignment.id)"
              >
                <td>
                  <div class="student-assignment-row__main">
                    <h3 class="student-assignment-row__title">{{ assignment.title }}</h3>
                  </div>
                </td>
                <td :data-testid="`student-assignment-row-published-${assignment.id}`">
                  {{ formatStudentAssignmentDateTime(assignment.createdAt) }}
                </td>
                <td :data-testid="`student-assignment-row-due-${assignment.id}`">
                  {{ formatStudentAssignmentDateTime(assignment.dueAt) }}
                </td>
                <td :data-testid="`student-assignment-row-status-${assignment.id}`">
                  <span class="status-pill" :class="studentAssignmentStatusTone(assignment)">
                    {{ getStudentAssignmentStatusText(assignment) }}
                  </span>
                </td>
                <td>
                  <RouterLink
                    class="button button--primary student-assignment-row__action"
                    :to="`/student/assignments/${assignment.id}`"
                    :data-testid="`student-assignment-link-${assignment.id}`"
                    @click.stop
                  >
                    {{ studentAssignmentActionLabel(assignment) }}
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <StatePanel v-if="!assignments.length" :message="uiCopy.emptyStudentAssignments" test-id="student-assignments-empty" />
      </template>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRouter } from "vue-router";
import type { StudentAssignmentItem } from "@/api/client";
import PaginationControls from "@/components/PaginationControls.vue";
import StatePanel from "@/components/StatePanel.vue";
import {
  formatStudentAssignmentDateTime,
  getStudentAssignmentStatusText,
  useStudentAssignments,
} from "@/composables/useStudentAssignments";
import { studentAssignmentStatusTone, uiCopy } from "@/utils/ui-copy";

const { assignments, loading, errorText, loadAssignments } = useStudentAssignments();
const router = useRouter();
const assignmentPageSizeOptions = [1, 30, 50, 60, 100];
const assignmentPage = ref(1);
const assignmentPageSize = ref(30);
const totalAssignments = computed(() => assignments.value.length);
const totalAssignmentPages = computed(() => Math.max(1, Math.ceil(Math.max(totalAssignments.value, 1) / assignmentPageSize.value)));
const visibleAssignments = computed(() => {
  const start = (assignmentPage.value - 1) * assignmentPageSize.value;
  return assignments.value.slice(start, start + assignmentPageSize.value);
});

function studentAssignmentActionLabel(assignment: StudentAssignmentItem) {
  if (!assignment.overdue && !assignment.submission) {
    return "提交";
  }
  return "查看";
}

async function openAssignment(assignmentId: number) {
  await router.push(`/student/assignments/${assignmentId}`);
}

function updateAssignmentPageSize(value: number) {
  if (!assignmentPageSizeOptions.includes(value)) {
    return;
  }
  assignmentPageSize.value = value;
  assignmentPage.value = 1;
}

function goPrevAssignmentPage() {
  if (assignmentPage.value <= 1) {
    return;
  }
  assignmentPage.value -= 1;
}

function goNextAssignmentPage() {
  if (assignmentPage.value >= totalAssignmentPages.value) {
    return;
  }
  assignmentPage.value += 1;
}

onMounted(async () => {
  await loadAssignments();
});

watch(totalAssignmentPages, (nextTotalPages) => {
  if (assignmentPage.value > nextTotalPages) {
    assignmentPage.value = nextTotalPages;
  }
});
</script>

<style scoped>
.student-assignments-workspace {
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.student-assignments-table-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--bg-surface);
}

.student-assignments-table {
  min-width: 860px;
  border: 0;
  border-radius: 0;
}

.student-assignments-table td {
  vertical-align: middle;
}

.student-assignments-table [data-testid^="student-assignment-row-published-"],
.student-assignments-table [data-testid^="student-assignment-row-due-"] {
  font-variant-numeric: tabular-nums;
}

.student-assignment-row--clickable {
  cursor: pointer;
}

.student-assignment-row--clickable:hover {
  background: var(--bg-subtle);
}

.student-assignment-row--clickable:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
}

.student-assignment-row__main {
  min-width: 0;
}

.student-assignment-row__title {
  margin: 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.student-assignment-row__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: flex-start;
  color: var(--text-secondary);
  font-size: 0.94rem;
  font-weight: 600;
}

.student-assignment-row__action {
  min-height: 32px;
  padding: 5px 11px;
  border-radius: 10px;
  white-space: nowrap;
}

@media (max-width: 920px) {
  .student-assignments-table {
    min-width: 640px;
  }

  .student-assignment-row__action {
    justify-self: flex-start;
  }
}
</style>

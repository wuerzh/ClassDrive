<template>
  <section class="classes-page assignments-page">
    <section class="assignments-page__workspace" data-testid="assignments-workspace">
      <section class="classes-page__board assignments-page__list-panel" data-testid="assignments-list-panel">
      <div class="assignments-page__toolbar">
        <FilterSelect
          v-model="selectedClassId"
          :options="classOptions"
          test-id="assignment-class-select"
          placeholder="选择班级"
          search-placeholder="搜索班级"
          @change="handleClassSelectionChange"
        />
        <div class="assignments-page__toolbar-actions">
          <button class="button button--primary" type="button" data-testid="assignment-create-open" @click="createDialogOpen = true">
            新建作业
          </button>
          <button class="button button--accent" type="button" data-testid="assignment-stats-open" @click="openMissingStatsDialog">
            作业统计
          </button>
          <button class="button" type="button" data-testid="assignment-submissions-download-open" @click="openSubmissionDownloadDialog">
            下载提交
          </button>
          <button class="button button--ghost" type="button" data-testid="assignment-refresh" aria-label="刷新作业列表" @click="loadAssignmentsPage">
            刷新
          </button>
        </div>
        <div class="assignments-page__search-group">
          <input
            v-model="assignmentKeyword"
            class="copy-dialog__search assignments-page__search"
            type="text"
            placeholder="搜索标题或说明"
            data-testid="assignment-search-input"
            @keyup.enter="applyAssignmentFilters"
          />
          <button class="button" type="button" data-testid="assignment-search-submit" @click="applyAssignmentFilters">搜索</button>
        </div>
      </div>

      <PaginationControls
        :page="assignmentPage"
        :page-size="assignmentPageSize"
        :page-size-options="assignmentPageSizeOptions"
        :total="totalAssignments"
        :total-pages="totalAssignmentPages"
        test-id-prefix="assignment"
        @update:page-size="updateAssignmentPageSize"
        @prev="goPrevAssignmentPage"
        @next="goNextAssignmentPage"
      />

      <div class="assignments-page__table-scroll">
        <table class="files-table assignments-page__table" data-testid="assignments-table">
          <thead>
            <tr>
              <th>
                <button
                  class="table-sort-button"
                  :class="{ 'is-active': assignmentSort === 'title-asc' || assignmentSort === 'title-desc' }"
                  type="button"
                  data-testid="assignment-sort-title"
                  @click="toggleAssignmentTitleSort"
                >
                  作业列表
                  <span class="table-sort-button__mark">{{ assignmentSortMark("title") }}</span>
                </button>
              </th>
              <th>状态</th>
              <th>
                <button
                  class="table-sort-button"
                  :class="{ 'is-active': assignmentSort === 'dueAt-asc' || assignmentSort === 'dueAt-desc' }"
                  type="button"
                  data-testid="assignment-sort-due"
                  @click="toggleAssignmentDueSort"
                >
                  截止时间
                  <span class="table-sort-button__mark">{{ assignmentSortMark("dueAt") }}</span>
                </button>
              </th>
              <th>
                <button
                  class="table-sort-button"
                  :class="{ 'is-active': assignmentSort === 'updated-desc' || assignmentSort === 'updated-asc' }"
                  type="button"
                  data-testid="assignment-sort-updated"
                  @click="toggleAssignmentUpdatedSort"
                >
                  更新时间
                  <span class="table-sort-button__mark">{{ assignmentSortMark("updated") }}</span>
                </button>
              </th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="assignment in assignments"
              :key="assignment.id"
              class="assignments-page__assignment-row"
              role="link"
              tabindex="0"
              :data-testid="`assignment-row-${assignment.id}`"
              @click="openAssignmentDetail(assignment)"
              @keydown.enter.prevent="openAssignmentDetail(assignment)"
              @keydown.space.prevent="openAssignmentDetail(assignment)"
            >
              <td>
                <strong class="assignments-page__title">{{ assignment.title }}</strong>
              </td>
              <td>
                <StatusPill :label="assignmentStatusLabel(assignment.status)" :tone="assignmentStatusTone(assignment.status)" />
              </td>
              <td>
                {{ formatDueAt(assignment.dueAt) }}
              </td>
              <td>
                {{ formatDueAt(assignment.updatedAt) }}
              </td>
              <td class="files-table__actions">
                <div class="assignments-page__row-actions">
                  <RouterLink
                    class="button button--secondary"
                    :to="`/assignments/classes/${assignment.classId}/${assignment.id}`"
                    :data-testid="`assignment-detail-link-${assignment.id}`"
                    @click.stop
                  >
                    详情/批改
                  </RouterLink>
                  <button
                    v-if="assignment.status === 'draft'"
                    class="button button--success"
                    type="button"
                    :data-testid="`assignment-publish-${assignment.id}`"
                    @click.stop="publishAssignment(assignment)"
                  >
                    发布
                  </button>
                  <button
                    v-else
                    class="button button--warning"
                    type="button"
                    :data-testid="`assignment-unpublish-${assignment.id}`"
                    @click.stop="unpublishAssignment(assignment)"
                  >
                    取消发布
                  </button>
                  <button
                    class="button"
                    type="button"
                    :data-testid="`assignment-copy-open-${assignment.id}`"
                    @click.stop="openAssignmentCopyDialog(assignment)"
                  >
                    复制
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!assignments.length">
              <td colspan="5" class="files-table__empty">
                {{ loadingAssignments ? "正在加载作业列表..." : currentClass ? "当前筛选下没有作业。" : uiCopy.emptyClasses }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </section>
    </section>
  </section>

  <div v-if="createDialogOpen" class="copy-dialog-backdrop">
    <section class="copy-dialog assignments-page__dialog" data-testid="assignment-create-dialog">
      <div class="copy-dialog__header">
        <div>
          <div class="copy-dialog__eyebrow">作业创建</div>
          <h3 class="copy-dialog__title">新建作业</h3>
        </div>
        <button class="button button--ghost" type="button" data-testid="assignment-create-cancel-top" @click="closeCreateDialog">
          关闭
        </button>
      </div>

      <div class="assignments-page__dialog-fields">
        <div class="students-form assignments-page__create-row" data-testid="assignment-create-row">
          <input
            v-model="assignmentTitle"
            class="copy-dialog__search"
            type="text"
            placeholder="作业标题"
            data-testid="assignment-create-title"
          />
          <select
            v-model="assignmentStatus"
            class="copy-dialog__search"
            data-testid="assignment-create-status"
          >
            <option value="draft">未发布</option>
            <option value="published">已发布</option>
          </select>
          <label class="assignments-page__inline-field assignments-page__inline-field--datetime" data-testid="assignment-create-due-at-field">
            <div class="app-datetime-input" data-testid="assignment-create-due-at">
              <ElDatePicker
                v-model="assignmentDueAt"
                class="app-datetime-control"
                type="datetime"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DDTHH:mm"
                popper-class="classdrive-date-picker"
                placeholder="作业提交截止时间"
                :editable="false"
              />
            </div>
          </label>
        </div>
        <p class="assignments-page__help-text" data-testid="assignment-create-status-help">
          未发布仅老师可见；已发布后学生端可见并可提交。
        </p>
        <textarea
          v-model="assignmentDescription"
          class="students-import__input"
          placeholder="作业说明"
          data-testid="assignment-create-description"
        />
        <div class="students-form assignments-page__rule-row">
          <label class="assignments-page__inline-field">
            <span>提交方式</span>
            <select
              v-model="assignmentSubmissionMode"
              class="copy-dialog__search"
              data-testid="assignment-create-submission-mode"
            >
              <option value="any">不限</option>
              <option value="files">只收文件</option>
              <option value="folder">只收文件夹</option>
            </select>
          </label>
          <label class="assignments-page__inline-field">
            <span>提交格式</span>
            <select
              v-model="assignmentSubmissionTypeCategory"
              class="copy-dialog__search"
              data-testid="assignment-create-submission-type"
            >
              <option value="mixed">常用文件</option>
              <option value="image">图片文件</option>
              <option value="word">Word 文档</option>
              <option value="pdf">PDF 文件</option>
              <option value="archive">压缩包</option>
            </select>
          </label>
          <label class="assignments-page__inline-field">
            <span>最少文件数</span>
            <input
              v-model.number="assignmentMinFileCount"
              class="copy-dialog__search"
              type="number"
              min="1"
              max="500"
              step="1"
              data-testid="assignment-create-min-file-count"
            />
          </label>
        </div>
        <p class="assignments-page__help-text" data-testid="assignment-create-submission-rule-help">
          可要求提交文件夹，并限制最少文件数，便于检查作业是否完整。
        </p>
        <section class="assignments-page__attachment-manager" data-testid="assignment-create-attachment-manager">
          <div>
            <div class="assignments-page__attachment-manager-title">
              <span>附件管理</span>
              <span class="status-pill status-pill--neutral">创建后启用</span>
            </div>
            <p>保存作业后，在“修改作业”对话框上传、下载和删除附件，避免新建流程被文件选择打断。</p>
            <p>添加附件入口会在作业创建后启用，和修改作业对话框保持一致。</p>
          </div>
        </section>
        <div class="copy-dialog__actions assignments-page__create-actions" data-testid="assignment-create-actions">
          <button
            class="button button--primary assignments-page__create-submit"
            type="button"
            data-testid="assignment-create-submit"
            @click="createAssignment(false)"
          >
            新建作业
          </button>
        </div>
      </div>
    </section>
  </div>

  <div v-if="copyDialogAssignment" class="copy-dialog-backdrop">
    <section class="copy-dialog assignments-page__copy-dialog" data-testid="assignment-copy-dialog">
      <div class="copy-dialog__header">
        <div>
          <div class="copy-dialog__eyebrow">作业复用</div>
          <h3 class="copy-dialog__title">复制作业</h3>
        </div>
        <button class="button button--ghost" type="button" data-testid="assignment-copy-close" @click="closeAssignmentCopyDialog">
          关闭
        </button>
      </div>

      <div class="assignments-page__copy-summary" data-testid="assignment-copy-summary">
        <span>来源作业</span>
        <strong>{{ copyDialogAssignment.title }}</strong>
      </div>

      <div class="assignments-page__dialog-fields">
        <label class="app-field">
          <span>目标班级</span>
          <select v-model="copyTargetClassId" class="copy-dialog__search" data-testid="assignment-copy-class">
            <option
              v-for="item in classes"
              :key="item.id"
              :value="item.id"
            >
              {{ item.name }}
            </option>
          </select>
        </label>
        <label class="app-field">
          <span>发布状态</span>
          <select v-model="copyStatus" class="copy-dialog__search" data-testid="assignment-copy-status">
            <option value="draft">未发布</option>
            <option value="published">已发布</option>
          </select>
        </label>
        <p class="assignments-page__help-text" data-testid="assignment-copy-help">
          复制标题、说明和截止时间；附件可在复制后进入详情上传。
        </p>
      </div>

      <div class="copy-dialog__actions">
        <button class="button" type="button" @click="closeAssignmentCopyDialog">取消</button>
        <button class="button button--primary" type="button" data-testid="assignment-copy-submit" @click="copyAssignment">
          创建副本
        </button>
      </div>
    </section>
  </div>

  <div v-if="missingStatsOpen" class="copy-dialog-backdrop">
    <section class="copy-dialog assignments-page__dialog" data-testid="assignment-missing-dialog">
      <div class="copy-dialog__header">
        <div>
          <div class="copy-dialog__eyebrow">作业统计</div>
          <h3 class="copy-dialog__title">{{ currentClass ? `${currentClass.name} · 作业统计` : "作业统计" }}</h3>
        </div>
        <button class="button button--ghost" type="button" data-testid="assignment-missing-close" @click="missingStatsOpen = false">
          关闭
        </button>
      </div>

      <div class="assignments-page__dialog-fields">
        <div class="assignments-page__stats-controls" data-testid="assignment-stats-controls">
          <div class="assignments-page__missing-scope" data-testid="assignment-missing-scope">
            <button class="button" type="button" data-testid="assignment-missing-select-all" @click="selectAllMissingAssignments">
              全部作业
            </button>
            <button class="button button--ghost" type="button" data-testid="assignment-missing-clear" @click="clearMissingAssignments">
              清空选择
            </button>
            <span class="assignments-page__missing-count" data-testid="assignment-missing-selected-count">
              已选 {{ selectedMissingAssignmentIds.length }} 次作业
            </span>
          </div>
        </div>
        <div class="assignments-page__missing-options" data-testid="assignment-missing-options">
          <label
            v-for="assignment in matchingAssignments"
            :key="assignment.id"
            class="assignments-page__missing-option"
          >
            <input
              type="checkbox"
              :checked="selectedMissingAssignmentIds.includes(assignment.id)"
              :data-testid="`assignment-missing-option-${assignment.id}`"
              @change="toggleMissingAssignment(assignment.id, $event)"
            />
            <span>{{ assignment.title }}</span>
          </label>
        </div>
        <p class="assignments-page__help-text" data-testid="assignment-missing-scope-help">
          可同时勾选多次作业，统计所选范围内每名学生的已交与未交次数。
        </p>

        <div class="assignments-page__stats-result-row" data-testid="assignment-stats-result-row">
          <p v-if="missingStatsLoading" class="muted">正在统计作业提交情况...</p>
          <p v-else-if="!activeAssignmentStatsRows.length" class="muted">当前范围内没有提交统计数据。</p>
          <p v-if="!missingStatsLoading && missingStatsAssignmentTotal" class="assignments-page__stats-summary" data-testid="assignment-stats-summary">
            {{ assignmentStatsSummaryText }}
          </p>
          <button
            class="button button--secondary"
            type="button"
            data-testid="assignment-missing-export"
            :disabled="!activeAssignmentStatsRows.length"
            @click="exportMissingStats"
          >
            导出 Excel
          </button>
        </div>
        <PaginationControls
          v-if="activeAssignmentStatsRows.length"
          :page="missingStatsPage"
          :page-size="missingStatsPageSize"
          :page-size-options="missingStatsPageSizeOptions"
          :total="activeAssignmentStatsRows.length"
          :total-pages="missingStatsTotalPages"
          test-id-prefix="assignment-missing"
          @update:page-size="updateMissingStatsPageSize"
          @prev="goPrevMissingStatsPage"
          @next="goNextMissingStatsPage"
        />
        <table v-if="!missingStatsLoading && activeAssignmentStatsRows.length" class="files-table" data-testid="assignment-missing-table">
          <thead>
            <tr>
              <th>学生</th>
              <th>
                <button
                  class="table-sort-button"
                  :class="{ 'is-active': assignmentStatsSortColumn === 'studentNo' }"
                  type="button"
                  data-testid="assignment-stats-sort-student-no"
                  @click="toggleAssignmentStatsSort('studentNo')"
                >
                  学号
                  <span class="table-sort-button__mark">{{ assignmentStatsSortMark("studentNo") }}</span>
                </button>
              </th>
              <th>
                <button
                  class="table-sort-button"
                  :class="{ 'is-active': assignmentStatsSortColumn === 'submittedCount' }"
                  type="button"
                  data-testid="assignment-stats-sort-submitted"
                  @click="toggleAssignmentStatsSort('submittedCount')"
                >
                  已交次数
                  <span class="table-sort-button__mark">{{ assignmentStatsSortMark("submittedCount") }}</span>
                </button>
              </th>
              <th>
                <button
                  class="table-sort-button"
                  :class="{ 'is-active': assignmentStatsSortColumn === 'missingCount' }"
                  type="button"
                  data-testid="assignment-stats-sort-missing"
                  @click="toggleAssignmentStatsSort('missingCount')"
                >
                  未交次数
                  <span class="table-sort-button__mark">{{ assignmentStatsSortMark("missingCount") }}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paginatedMissingStatsRows" :key="row.studentId">
              <td>{{ row.displayName }}</td>
              <td>{{ row.studentNo }}</td>
              <td>{{ row.submittedCount }}</td>
              <td>{{ row.missingCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>

  <div v-if="submissionDownloadOpen" class="copy-dialog-backdrop">
    <section class="copy-dialog assignments-page__dialog" data-testid="assignment-submissions-download-dialog">
      <div class="copy-dialog__header">
        <div>
          <div class="copy-dialog__eyebrow">提交下载</div>
          <h3 class="copy-dialog__title">{{ currentClass ? `${currentClass.name} · 作业提交包` : "作业提交包" }}</h3>
        </div>
        <button class="button button--ghost" type="button" data-testid="assignment-submissions-download-close" @click="submissionDownloadOpen = false">
          关闭
        </button>
      </div>

      <div class="assignments-page__dialog-fields">
        <label class="field">
          <span>选择作业</span>
          <div class="assignments-page__missing-scope" data-testid="assignment-submissions-download-scope">
            <button class="button" type="button" data-testid="assignment-submissions-download-select-all" @click="selectAllSubmissionDownloadAssignments">
              全选
            </button>
            <button class="button button--ghost" type="button" data-testid="assignment-submissions-download-clear" @click="clearSubmissionDownloadAssignments">
              清空
            </button>
            <span class="assignments-page__missing-count" data-testid="assignment-submissions-download-selected-count">
              已选 {{ selectedSubmissionDownloadAssignmentIds.length }} 次作业
            </span>
          </div>
          <div class="assignments-page__missing-options" data-testid="assignment-submissions-download-options">
            <label
              v-for="assignment in matchingAssignments"
              :key="assignment.id"
              class="assignments-page__missing-option"
            >
              <input
                type="checkbox"
                :checked="selectedSubmissionDownloadAssignmentIds.includes(assignment.id)"
                :data-testid="`assignment-submissions-download-option-${assignment.id}`"
                @change="toggleSubmissionDownloadAssignment(assignment.id, $event)"
              />
              <span>{{ assignment.title }}</span>
            </label>
          </div>
          <p class="assignments-page__help-text" data-testid="assignment-submissions-download-help">
            下载包按“作业标题 / 学号-姓名 / 原文件夹层级”整理，并包含提交清单和未提交清单，便于教学检查核对。
          </p>
        </label>

        <div class="copy-dialog__actions">
          <button class="button" type="button" @click="submissionDownloadOpen = false">取消</button>
          <a
            class="button"
            :href="allSubmissionArchiveUrl"
            data-testid="assignment-submissions-download-all"
          >
            下载全部
          </a>
          <a
            class="button button--primary"
            :class="{ 'is-disabled': !selectedSubmissionDownloadAssignmentIds.length }"
            :href="selectedSubmissionArchiveUrl"
            :aria-disabled="!selectedSubmissionDownloadAssignmentIds.length"
            data-testid="assignment-submissions-download-selected"
            @click="guardSelectedSubmissionDownload"
          >
            下载所选
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import { ElDatePicker } from "element-plus";
import { RouterLink, useRoute, useRouter, type LocationQueryRaw } from "vue-router";
import FilterSelect, { type FilterSelectOption } from "@/components/FilterSelect.vue";
import PaginationControls from "@/components/PaginationControls.vue";
import StatusPill from "@/components/StatusPill.vue";
import { api, ApiError, type AssignmentItem, type AssignmentSubmissionMode, type AssignmentSubmissionTypeCategory } from "@/api/client";
import { useAssignmentsStore } from "@/stores/assignments";
import { useClassesStore } from "@/stores/classes";
import { useToastStore } from "@/stores/toast";
import { exportRowsToSpreadsheet } from "@/utils/spreadsheet-export";
import { assignmentStatusLabel, assignmentStatusTone, uiCopy } from "@/utils/ui-copy";

type AssignmentSort = "updated-desc" | "updated-asc" | "dueAt-asc" | "dueAt-desc" | "title-asc" | "title-desc";
type AssignmentStatus = "draft" | "published";
type AssignmentStatsSortColumn = "studentNo" | "submittedCount" | "missingCount";
type SortDirection = "asc" | "desc";
interface MissingStatsRow {
  studentId: number;
  studentNo: string;
  displayName: string;
  submittedCount: number;
  missingCount: number;
}

const defaultAssignmentSort: AssignmentSort = "updated-desc";
const defaultAssignmentPageSize = 30;
const assignmentPageSizeOptions = [30, 60, 100];
const defaultMissingStatsPageSize = 30;
const missingStatsPageSizeOptions = [30, 60, 100];
const fullStatsPageSize = 100;

const route = useRoute();
const router = useRouter();
const toastStore = useToastStore();
const assignmentsStore = useAssignmentsStore();
const classesStore = useClassesStore();
const { classes } = storeToRefs(classesStore);

const selectedClassId = ref<number | null>(null);
const assignmentKeyword = ref("");
const assignmentSort = ref<AssignmentSort>(defaultAssignmentSort);
const assignmentPage = ref(1);
const assignmentPageSize = ref(defaultAssignmentPageSize);
const totalAssignments = ref(0);
const totalAssignmentPages = ref(1);
const loadingAssignments = ref(false);
const pageAssignments = ref<AssignmentItem[]>([]);
const matchingAssignments = ref<AssignmentItem[]>([]);
const selectedMissingAssignmentIds = ref<number[]>([]);
const assignmentTitle = ref("");
const assignmentDescription = ref("");
const assignmentDueAt = ref("");
const assignmentStatus = ref<AssignmentStatus>("draft");
const assignmentSubmissionMode = ref<AssignmentSubmissionMode>("any");
const assignmentSubmissionTypeCategory = ref<AssignmentSubmissionTypeCategory>("mixed");
const assignmentMinFileCount = ref(1);
const createDialogOpen = ref(false);
const copyDialogAssignment = ref<AssignmentItem | null>(null);
const copyTargetClassId = ref<number | null>(null);
const copyStatus = ref<AssignmentStatus>("draft");
const missingStatsOpen = ref(false);
const missingStatsLoading = ref(false);
const assignmentStatsSortColumn = ref<AssignmentStatsSortColumn>("missingCount");
const assignmentStatsSortDirection = ref<SortDirection>("desc");
const missingStatsRows = ref<MissingStatsRow[]>([]);
const missingStatsPage = ref(1);
const missingStatsPageSize = ref(defaultMissingStatsPageSize);
const missingStatsRosterTotal = ref(0);
const missingStatsAssignmentTotal = ref(0);
const missingStatsSubmittedSlots = ref(0);
const missingStatsMissingSlots = ref(0);
const submissionDownloadOpen = ref(false);
const selectedSubmissionDownloadAssignmentIds = ref<number[]>([]);

const currentClassId = computed(() => {
  const parsed = Number(route.params.classId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
});

const assignments = computed(() => pageAssignments.value);
const currentClass = computed(() => classes.value.find((item) => item.id === selectedClassId.value) ?? null);
const classOptions = computed<FilterSelectOption[]>(() => classes.value.map((item) => ({ label: item.name, value: item.id })));
const allSubmissionArchiveUrl = computed(() => (
  selectedClassId.value ? api.assignmentSubmissionsArchiveUrl({ classId: selectedClassId.value }) : "#"
));
const selectedSubmissionArchiveUrl = computed(() => (
  selectedClassId.value && selectedSubmissionDownloadAssignmentIds.value.length
    ? api.assignmentSubmissionsArchiveUrl({
      classId: selectedClassId.value,
      assignmentIds: selectedSubmissionDownloadAssignmentIds.value,
    })
    : "#"
));
const activeAssignmentStatsRows = computed(() => {
  const rows = missingStatsRows.value.filter((row) => row.submittedCount > 0 || row.missingCount > 0);
  return [...rows].sort((left, right) => (
    compareAssignmentStatsRows(left, right)
    || left.studentNo.localeCompare(right.studentNo)
  ));
});
const missingStatsTotalPages = computed(() => Math.max(1, Math.ceil(activeAssignmentStatsRows.value.length / missingStatsPageSize.value)));
const assignmentStatsSummaryText = computed(() => {
  const expectedTotal = missingStatsRosterTotal.value * missingStatsAssignmentTotal.value;
  return `全班 ${missingStatsRosterTotal.value} 人 · 已选 ${missingStatsAssignmentTotal.value} 次作业 · 应交 ${expectedTotal} 份 · 已交 ${missingStatsSubmittedSlots.value} 份 · 未交 ${missingStatsMissingSlots.value} 份`;
});
const paginatedMissingStatsRows = computed(() => {
  const start = (missingStatsPage.value - 1) * missingStatsPageSize.value;
  return activeAssignmentStatsRows.value.slice(start, start + missingStatsPageSize.value);
});

function parsePositiveInt(raw: unknown, fallback: number) {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseAssignmentSort(raw: unknown): AssignmentSort {
  return raw === "dueAt-asc"
    || raw === "dueAt-desc"
    || raw === "title-asc"
    || raw === "title-desc"
    || raw === "updated-asc"
    || raw === "updated-desc"
    ? raw
    : defaultAssignmentSort;
}

function normalizeAssignmentPageSize(value: number) {
  return assignmentPageSizeOptions.includes(value) ? value : defaultAssignmentPageSize;
}

function normalizeAssignmentMinFileCount(value: number) {
  if (!Number.isFinite(value)) {
    return null;
  }
  const normalized = Math.trunc(value);
  if (normalized < 1 || normalized > 500) {
    return null;
  }
  return normalized;
}

function resolveAssignmentSubmissionTypeCategory(assignment?: Pick<AssignmentItem, "submissionTypeCategory"> | null): AssignmentSubmissionTypeCategory {
  const category = assignment?.submissionTypeCategory;
  return category === "image" || category === "word" || category === "pdf" || category === "archive" || category === "mixed"
    ? category
    : "mixed";
}

function shouldLoadNextListPage(pagination: { totalPages: number } | undefined, itemCount: number, page: number) {
  if (pagination) {
    return page < pagination.totalPages;
  }
  return itemCount === fullStatsPageSize;
}

async function loadAllMatchingAssignments(): Promise<AssignmentItem[]> {
  if (!selectedClassId.value) {
    return [];
  }
  const rows: AssignmentItem[] = [];
  let page = 1;
  for (;;) {
    const response = await api.assignments({
      classId: selectedClassId.value,
      q: assignmentKeyword.value.trim() || undefined,
      sort: assignmentSort.value === defaultAssignmentSort ? undefined : assignmentSort.value,
      page,
      pageSize: fullStatsPageSize,
    });
    const assignments = response.assignments ?? [];
    rows.push(...assignments);
    if (!shouldLoadNextListPage(response.pagination, assignments.length, page)) {
      return rows;
    }
    page += 1;
  }
}

async function loadClasses() {
  try {
    await classesStore.load();
  } catch {
    classesStore.clear();
  }
}

function applyStateFromRoute() {
  const fallbackClassId = classes.value[0]?.id ?? null;
  selectedClassId.value = currentClassId.value ?? (parsePositiveInt(route.query.classId, fallbackClassId ?? 0) || fallbackClassId);
  assignmentKeyword.value = typeof route.query.q === "string" ? route.query.q : "";
  assignmentSort.value = parseAssignmentSort(route.query.sort);
  assignmentPage.value = parsePositiveInt(route.query.page, 1);
  assignmentPageSize.value = normalizeAssignmentPageSize(parsePositiveInt(route.query.pageSize, defaultAssignmentPageSize));
}

function buildAssignmentsQuery(overrides: Partial<{
  classId: number | null;
  q: string;
  sort: AssignmentSort;
  page: number;
  pageSize: number;
}> = {}) {
  const nextClassId = overrides.classId ?? selectedClassId.value;
  const nextKeyword = (overrides.q ?? assignmentKeyword.value).trim();
  const hasSortOverride = Object.prototype.hasOwnProperty.call(overrides, "sort");
  const nextSort = overrides.sort ?? assignmentSort.value;
  const nextPage = overrides.page ?? assignmentPage.value;
  const nextPageSize = overrides.pageSize ?? assignmentPageSize.value;

  const query: LocationQueryRaw = {};
  if (currentClassId.value === null && nextClassId) {
    query.classId = String(nextClassId);
  }
  if (nextKeyword) {
    query.q = nextKeyword;
  }
  if (nextSort !== defaultAssignmentSort || hasSortOverride) {
    query.sort = nextSort;
  }
  if (nextPage > 1) {
    query.page = String(nextPage);
  }
  if (nextPageSize !== defaultAssignmentPageSize) {
    query.pageSize = String(nextPageSize);
  }
  return query;
}

async function replaceAssignmentsRoute(overrides: Partial<{
  classId: number | null;
  q: string;
  sort: AssignmentSort;
  page: number;
  pageSize: number;
}> = {}) {
  const nextClassId = overrides.classId ?? selectedClassId.value;
  const path = currentClassId.value !== null && nextClassId
    ? `/assignments/classes/${nextClassId}`
    : "/assignments";
  await router.replace({ path, query: buildAssignmentsQuery(overrides) });
}

async function loadAssignmentsPage() {
  loadingAssignments.value = true;
  try {
    await loadClasses();
    applyStateFromRoute();
    if (!selectedClassId.value && classes.value.length > 0) {
      await replaceAssignmentsRoute({ classId: classes.value[0].id, page: 1 });
      return;
    }
    if (selectedClassId.value && !classes.value.some((item) => item.id === selectedClassId.value) && classes.value.length > 0) {
      await replaceAssignmentsRoute({ classId: classes.value[0].id, page: 1 });
      return;
    }
    if (!selectedClassId.value) {
      pageAssignments.value = [];
      totalAssignments.value = 0;
      totalAssignmentPages.value = 1;
      matchingAssignments.value = [];
      return;
    }

    const response = await api.assignments({
      classId: selectedClassId.value,
      q: assignmentKeyword.value.trim() || undefined,
      sort: assignmentSort.value === defaultAssignmentSort ? undefined : assignmentSort.value,
      page: assignmentPage.value > 1 ? assignmentPage.value : undefined,
      pageSize: assignmentPageSize.value !== defaultAssignmentPageSize ? assignmentPageSize.value : undefined,
    });
    pageAssignments.value = response.assignments ?? [];
    assignmentsStore.setClassAssignments(selectedClassId.value, pageAssignments.value);
    totalAssignments.value = response.pagination?.total ?? response.assignments?.length ?? 0;
    totalAssignmentPages.value = Math.max(1, response.pagination?.totalPages ?? 1);
    matchingAssignments.value = response.assignments ?? [];

    if (assignmentPage.value > totalAssignmentPages.value) {
      await replaceAssignmentsRoute({ page: totalAssignmentPages.value });
    }
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "加载作业列表失败");
  } finally {
    loadingAssignments.value = false;
  }
}

function formatDueAt(value: string) {
  if (!value) {
    return uiCopy.emptyValue;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("zh-CN", {
    hour12: false,
  });
}

function toAssignmentDueAt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }
  return parsed.toISOString();
}

function updateAssignmentInLists(updated: AssignmentItem) {
  pageAssignments.value = pageAssignments.value.map((assignment) => (assignment.id === updated.id ? updated : assignment));
  matchingAssignments.value = matchingAssignments.value.map((assignment) => (assignment.id === updated.id ? updated : assignment));
  assignmentsStore.setClassAssignments(selectedClassId.value ?? updated.classId, pageAssignments.value);
}

async function handleClassSelectionChange() {
  await replaceAssignmentsRoute({ classId: selectedClassId.value, page: 1 });
}

async function applyAssignmentFilters() {
  await replaceAssignmentsRoute({ q: assignmentKeyword.value, page: 1 });
}

async function applyAssignmentSort(nextSort: AssignmentSort) {
  assignmentSort.value = nextSort;
  await replaceAssignmentsRoute({ sort: nextSort, page: 1 });
}

async function toggleAssignmentTitleSort() {
  await applyAssignmentSort(assignmentSort.value === "title-asc" ? "title-desc" : "title-asc");
}

async function toggleAssignmentDueSort() {
  await applyAssignmentSort(assignmentSort.value === "dueAt-asc" ? "dueAt-desc" : "dueAt-asc");
}

async function toggleAssignmentUpdatedSort() {
  await applyAssignmentSort(assignmentSort.value === "updated-desc" ? "updated-asc" : "updated-desc");
}

function assignmentSortMark(column: "title" | "dueAt" | "updated") {
  if (column === "title") {
    if (assignmentSort.value === "title-desc") {
      return "↓";
    }
    return assignmentSort.value === "title-asc" ? "↑" : "";
  }
  if (column === "updated") {
    if (assignmentSort.value === "updated-asc") {
      return "↑";
    }
    return assignmentSort.value === "updated-desc" ? "↓" : "";
  }
  if (assignmentSort.value === "dueAt-desc") {
    return "↓";
  }
  return assignmentSort.value === "dueAt-asc" ? "↑" : "";
}

function compareAssignmentStatsRows(left: MissingStatsRow, right: MissingStatsRow) {
  const column = assignmentStatsSortColumn.value;
  const delta = column === "studentNo"
    ? left.studentNo.localeCompare(right.studentNo, "zh-CN", { numeric: true })
    : left[column] - right[column];
  return assignmentStatsSortDirection.value === "asc" ? delta : -delta;
}

function toggleAssignmentStatsSort(column: AssignmentStatsSortColumn) {
  if (assignmentStatsSortColumn.value === column) {
    assignmentStatsSortDirection.value = assignmentStatsSortDirection.value === "desc" ? "asc" : "desc";
  } else {
    assignmentStatsSortColumn.value = column;
    assignmentStatsSortDirection.value = column === "studentNo" ? "asc" : "desc";
  }
  missingStatsPage.value = 1;
}

function assignmentStatsSortMark(column: AssignmentStatsSortColumn) {
  if (assignmentStatsSortColumn.value !== column) {
    return "";
  }
  return assignmentStatsSortDirection.value === "desc" ? "↓" : "↑";
}

function resetAssignmentStatsSort() {
  assignmentStatsSortColumn.value = "missingCount";
  assignmentStatsSortDirection.value = "desc";
}

async function updateAssignmentPageSize(value: number) {
  await replaceAssignmentsRoute({ pageSize: value, page: 1 });
}

async function goPrevAssignmentPage() {
  if (assignmentPage.value <= 1) {
    return;
  }
  await replaceAssignmentsRoute({ page: assignmentPage.value - 1 });
}

async function goNextAssignmentPage() {
  if (assignmentPage.value >= totalAssignmentPages.value) {
    return;
  }
  await replaceAssignmentsRoute({ page: assignmentPage.value + 1 });
}

function resetCreateDialogFields() {
  assignmentTitle.value = "";
  assignmentDescription.value = "";
  assignmentDueAt.value = "";
  assignmentStatus.value = "draft";
  assignmentSubmissionMode.value = "any";
  assignmentSubmissionTypeCategory.value = "mixed";
  assignmentMinFileCount.value = 1;
}

function closeCreateDialog() {
  createDialogOpen.value = false;
  resetCreateDialogFields();
}

function openAssignmentCopyDialog(assignment: AssignmentItem) {
  copyDialogAssignment.value = assignment;
  copyTargetClassId.value = selectedClassId.value ?? assignment.classId;
  copyStatus.value = "draft";
}

function closeAssignmentCopyDialog() {
  copyDialogAssignment.value = null;
  copyTargetClassId.value = null;
  copyStatus.value = "draft";
}

async function loadMatchingAssignments() {
  if (!selectedClassId.value) {
    matchingAssignments.value = [];
    return;
  }
  matchingAssignments.value = await loadAllMatchingAssignments();
}

async function openMissingStatsDialog() {
  missingStatsOpen.value = true;
  resetAssignmentStatsSort();
  await loadMatchingAssignments();
  selectAllMissingAssignmentsWithoutLoad();
  missingStatsPage.value = 1;
  await loadMissingStats();
}

async function openSubmissionDownloadDialog() {
  submissionDownloadOpen.value = true;
  await loadMatchingAssignments();
  selectedSubmissionDownloadAssignmentIds.value = matchingAssignments.value.map((assignment) => assignment.id);
}

function selectAllMissingAssignmentsWithoutLoad() {
  selectedMissingAssignmentIds.value = matchingAssignments.value.map((assignment) => assignment.id);
}

async function selectAllMissingAssignments() {
  selectAllMissingAssignmentsWithoutLoad();
  missingStatsPage.value = 1;
  await loadMissingStats();
}

async function clearMissingAssignments() {
  selectedMissingAssignmentIds.value = [];
  missingStatsPage.value = 1;
  await loadMissingStats();
}

function selectAllSubmissionDownloadAssignments() {
  selectedSubmissionDownloadAssignmentIds.value = matchingAssignments.value.map((assignment) => assignment.id);
}

function clearSubmissionDownloadAssignments() {
  selectedSubmissionDownloadAssignmentIds.value = [];
}

async function toggleMissingAssignment(assignmentId: number, event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  if (target.checked) {
    if (!selectedMissingAssignmentIds.value.includes(assignmentId)) {
      selectedMissingAssignmentIds.value = [...selectedMissingAssignmentIds.value, assignmentId];
    }
  } else {
    selectedMissingAssignmentIds.value = selectedMissingAssignmentIds.value.filter((id) => id !== assignmentId);
  }
  missingStatsPage.value = 1;
  await loadMissingStats();
}

function updateMissingStatsPageSize(value: number) {
  missingStatsPageSize.value = missingStatsPageSizeOptions.includes(value) ? value : defaultMissingStatsPageSize;
  missingStatsPage.value = 1;
}

function goPrevMissingStatsPage() {
  if (missingStatsPage.value <= 1) {
    return;
  }
  missingStatsPage.value -= 1;
}

function goNextMissingStatsPage() {
  if (missingStatsPage.value >= missingStatsTotalPages.value) {
    return;
  }
  missingStatsPage.value += 1;
}

function exportMissingStats() {
  if (!activeAssignmentStatsRows.value.length) {
    toastStore.push("warning", "当前没有可导出的作业统计");
    return;
  }
  const statsLabel = "作业统计";
  exportRowsToSpreadsheet({
    fileName: `${currentClass.value?.name ?? statsLabel}-${statsLabel}.xls`,
    sheetName: statsLabel,
    rows: activeAssignmentStatsRows.value,
    columns: [
      { header: "学生", value: (row) => row.displayName },
      { header: "学号", value: (row) => row.studentNo },
      { header: "已交次数", value: (row) => row.submittedCount },
      { header: "未交次数", value: (row) => row.missingCount },
    ],
  });
  toastStore.push("success", `${statsLabel}已导出`);
}

function toggleSubmissionDownloadAssignment(assignmentId: number, event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  if (target.checked) {
    if (!selectedSubmissionDownloadAssignmentIds.value.includes(assignmentId)) {
      selectedSubmissionDownloadAssignmentIds.value = [...selectedSubmissionDownloadAssignmentIds.value, assignmentId];
    }
  } else {
    selectedSubmissionDownloadAssignmentIds.value = selectedSubmissionDownloadAssignmentIds.value.filter((id) => id !== assignmentId);
  }
}

function guardSelectedSubmissionDownload(event: MouseEvent) {
  if (selectedSubmissionDownloadAssignmentIds.value.length > 0) {
    return;
  }
  event.preventDefault();
  toastStore.push("error", "请先选择要下载的作业");
}

async function loadMissingStats() {
  if (!selectedClassId.value) {
    missingStatsRows.value = [];
    missingStatsRosterTotal.value = 0;
    missingStatsAssignmentTotal.value = 0;
    missingStatsSubmittedSlots.value = 0;
    missingStatsMissingSlots.value = 0;
    return;
  }
  if (selectedMissingAssignmentIds.value.length === 0) {
    missingStatsRows.value = [];
    missingStatsRosterTotal.value = 0;
    missingStatsAssignmentTotal.value = 0;
    missingStatsSubmittedSlots.value = 0;
    missingStatsMissingSlots.value = 0;
    return;
  }
  missingStatsLoading.value = true;
  try {
    const statistics = await api.assignmentStatistics({
      classId: selectedClassId.value,
      assignmentIds: selectedMissingAssignmentIds.value,
    });
    missingStatsRosterTotal.value = statistics.rosterTotal;
    missingStatsAssignmentTotal.value = statistics.assignmentTotal;
    missingStatsSubmittedSlots.value = statistics.submittedTotal;
    missingStatsMissingSlots.value = statistics.missingTotal;
    missingStatsRows.value = (statistics.rows ?? [])
      .filter((item) => item.submittedCount > 0 || item.missingCount > 0);
    if (missingStatsPage.value > missingStatsTotalPages.value) {
      missingStatsPage.value = missingStatsTotalPages.value;
    }
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "统计未交名单失败");
    missingStatsRows.value = [];
    missingStatsRosterTotal.value = 0;
    missingStatsAssignmentTotal.value = 0;
    missingStatsSubmittedSlots.value = 0;
    missingStatsMissingSlots.value = 0;
  } finally {
    missingStatsLoading.value = false;
  }
}

async function openAssignmentDetail(assignment: AssignmentItem) {
  await router.push(`/assignments/classes/${assignment.classId}/${assignment.id}`);
}

async function createAssignment(openDetail = false) {
  if (!selectedClassId.value) {
    toastStore.push("error", "请先选择班级");
    return;
  }
  if (!assignmentTitle.value.trim()) {
    toastStore.push("error", "请输入作业标题");
    return;
  }
  const minFileCount = normalizeAssignmentMinFileCount(assignmentMinFileCount.value);
  if (minFileCount === null) {
    toastStore.push("error", "最少文件数需在 1 到 500 之间");
    return;
  }
  try {
    const created = await assignmentsStore.create({
      classId: selectedClassId.value,
      title: assignmentTitle.value.trim(),
      description: assignmentDescription.value.trim(),
      dueAt: toAssignmentDueAt(assignmentDueAt.value),
      status: assignmentStatus.value,
      submissionMode: assignmentSubmissionMode.value,
      submissionTypeCategory: assignmentSubmissionTypeCategory.value,
      minFileCount,
    });
    resetCreateDialogFields();
    createDialogOpen.value = false;
    pageAssignments.value = [created, ...pageAssignments.value];
    matchingAssignments.value = [created, ...matchingAssignments.value];
    totalAssignments.value += 1;
    toastStore.push("success", "作业已创建");
    if (openDetail) {
      await router.push(`/assignments/classes/${created.classId}/${created.id}`);
    }
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "创建作业失败");
  }
}

async function publishAssignment(assignment: AssignmentItem) {
  await updateAssignmentStatus(assignment, "published");
}

async function unpublishAssignment(assignment: AssignmentItem) {
  await updateAssignmentStatus(assignment, "draft");
}

async function updateAssignmentStatus(assignment: AssignmentItem, status: AssignmentStatus) {
  try {
    const updated = await api.updateAssignment({
      assignmentId: assignment.id,
      classId: assignment.classId,
      title: assignment.title,
      description: assignment.description,
      dueAt: assignment.dueAt,
      status,
      submissionMode: assignment.submissionMode,
      submissionTypeCategory: resolveAssignmentSubmissionTypeCategory(assignment),
      minFileCount: assignment.minFileCount,
    });
    updateAssignmentInLists(updated);
    toastStore.push("success", status === "published" ? "作业已发布" : "作业已取消发布");
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : status === "published" ? "发布作业失败" : "取消发布失败");
  }
}

async function copyAssignment() {
  const source = copyDialogAssignment.value;
  const targetClassId = copyTargetClassId.value;
  if (!source || !targetClassId) {
    toastStore.push("error", "请选择目标班级");
    return;
  }
  try {
    const created = await assignmentsStore.create({
      classId: targetClassId,
      title: targetClassId === source.classId ? `${source.title}（副本）` : source.title,
      description: source.description,
      dueAt: source.dueAt,
      status: copyStatus.value,
      submissionMode: source.submissionMode,
      submissionTypeCategory: resolveAssignmentSubmissionTypeCategory(source),
      minFileCount: source.minFileCount,
    });
    if (targetClassId === selectedClassId.value) {
      pageAssignments.value = [created, ...pageAssignments.value];
      matchingAssignments.value = [created, ...matchingAssignments.value];
      totalAssignments.value += 1;
    }
    closeAssignmentCopyDialog();
    toastStore.push("success", "复制作业已创建");
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "复制作业失败");
  }
}

watch(() => route.fullPath, () => {
  void loadAssignmentsPage();
}, { immediate: true });
</script>

<style scoped>
.assignments-page__workspace {
  display: grid;
  gap: 12px;
}

.assignments-page__toolbar-actions,
.assignments-page__toolbar,
.assignments-page__search-group {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.assignments-page__toolbar {
  justify-content: flex-start;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-soft);
}

.assignments-page__toolbar :deep(.filter-select) {
  flex: 0 0 180px;
}

.assignments-page__toolbar-actions {
  gap: 8px;
}

.assignments-page__search-group {
  flex: 0 1 310px;
  margin-left: auto;
}

.assignments-page__search {
  width: min(220px, 100%);
}

.assignments-page__list-panel {
  display: grid;
  gap: 12px;
}

.assignments-page__table-scroll {
  width: 100%;
  overflow-x: auto;
}

.assignments-page__table {
  table-layout: fixed;
  min-width: 900px;
}

.assignments-page__table th:nth-child(1),
.assignments-page__table td:nth-child(1) {
  width: 30%;
}

.assignments-page__table th:nth-child(2),
.assignments-page__table td:nth-child(2) {
  width: 10%;
}

.assignments-page__table th:nth-child(3),
.assignments-page__table td:nth-child(3),
.assignments-page__table th:nth-child(4),
.assignments-page__table td:nth-child(4) {
  width: 16%;
}

.assignments-page__table th:nth-child(5),
.assignments-page__table td:nth-child(5) {
  width: 28%;
}

.assignments-page__title {
  display: inline-block;
  margin: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assignments-page__assignment-row {
  cursor: pointer;
}

.assignments-page__assignment-row:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: -2px;
}

.assignments-page__dialog {
  width: min(800px, 100%);
}

.assignments-page__dialog-fields {
  display: grid;
  gap: 10px;
}

.assignments-page__inline-field {
  display: grid;
  gap: 6px;
  min-width: 220px;
  flex: 1 1 260px;
  color: var(--text-secondary);
  font-size: 0.86rem;
  font-weight: 600;
}

.assignments-page__rule-row {
  align-items: end;
}

.assignments-page__attachment-manager {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--bg-subtle);
}

.assignments-page__attachment-manager-title {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  color: var(--text-primary);
  font-weight: 800;
}

.assignments-page__attachment-manager p {
  margin: 3px 0 0;
  color: var(--text-muted);
  font-size: 0.82rem;
  line-height: 1.35;
}

.assignments-page__create-row {
  align-items: end;
}

.assignments-page__create-row > .copy-dialog__search {
  min-width: 0;
  flex: 1 1 220px;
}

.assignments-page__inline-field--datetime {
  flex: 0 1 280px;
  min-width: 240px;
}

.assignments-page__help-text {
  margin: -6px 0 0;
  color: var(--text-muted);
  font-size: 0.84rem;
  line-height: 1.5;
}

.assignments-page__create-submit {
  min-width: 136px;
  min-height: 44px;
  align-self: end;
}

.assignments-page__create-actions {
  justify-content: flex-end;
}

.assignments-page__row-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  align-items: center;
}

.assignments-page__copy-dialog {
  width: min(560px, 100%);
}

.assignments-page__copy-summary {
  display: grid;
  gap: 4px;
  margin: 14px 0;
  padding: 12px 14px;
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  background: var(--bg-subtle);
}

.assignments-page__copy-summary span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.assignments-page__copy-summary strong {
  color: var(--text-primary);
}

.assignments-page__stats-controls,
.assignments-page__stats-mode-group,
.assignments-page__missing-scope,
.assignments-page__missing-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.assignments-page__stats-controls {
  gap: 10px 14px;
}

.assignments-page__stats-mode-group {
  flex: 0 0 auto;
  padding: 4px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--bg-subtle);
}

.assignments-page__control-label {
  padding: 0 4px;
  color: var(--text-muted);
  font-size: 0.84rem;
  font-weight: 800;
  white-space: nowrap;
}

.assignments-page__missing-scope {
  flex: 1 1 320px;
}

.assignments-page__missing-count {
  color: var(--text-secondary);
  font-size: 0.86rem;
  font-weight: 700;
}

.assignments-page__missing-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.assignments-page__stats-result-row {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.assignments-page__stats-summary {
  flex: 1 1 auto;
  margin: 0;
  padding: 9px 11px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: var(--bg-subtle);
  color: var(--text-secondary);
  font-size: 0.94rem;
  font-weight: 700;
}

.assignments-page__stats-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 0;
}

.assignments-page__missing-options {
  padding: 10px;
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  background: var(--bg-subtle);
}

.assignments-page__missing-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 10px;
  border: 1px solid var(--border-soft);
  border-radius: 999px;
  background: var(--control-bg);
  color: var(--text-primary);
  white-space: nowrap;
}

.assignments-page :deep(.button.is-disabled),
.assignments-page .button.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.assignments-page__table .files-table__actions .button {
  min-width: auto;
  min-height: 36px;
  padding: 7px 10px;
  font-size: 0.9rem;
  justify-content: center;
}

@media (max-width: 960px) {
  .assignments-page__toolbar {
    align-items: stretch;
  }

  .assignments-page__toolbar :deep(.filter-select) {
    flex-basis: 100%;
  }

  .assignments-page__search-group {
    flex-basis: 100%;
    margin-left: 0;
  }

  .assignments-page__search {
    width: 100%;
  }

  .assignments-page__create-row {
    align-items: stretch;
  }

  .assignments-page__table {
    table-layout: fixed;
  }
}
</style>

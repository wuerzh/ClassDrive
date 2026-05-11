<template>
  <section class="classes-page">
    <section class="classes-page__board student-assignment-detail__board" data-testid="student-assignment-detail-workspace">
      <div class="student-assignment-detail__toolbar" hidden>
        <RouterLink class="button button--ghost" to="/student/assignments" data-testid="student-assignment-detail-back">
          ↩ 返回
        </RouterLink>
        <button class="button button--ghost" type="button" data-testid="student-assignment-detail-refresh" @click="loadAssignment">
          刷新
        </button>
      </div>
      <StatePanel v-if="loading" message="正在加载作业详情..." test-id="student-assignment-detail-loading" />
      <StatePanel v-else-if="notFound" :message="uiCopy.assignmentNotFound" tone="error" test-id="student-assignment-detail-not-found" />
      <template v-else-if="assignment">
        <section class="student-assignment-detail__split" data-testid="student-assignment-overview">
        <article class="student-assignment-detail__card student-assignment-detail__card--info">
          <div class="student-assignment-detail__hero student-assignment-detail__overview-main">
            <div class="student-assignment-detail__overview-copy">
              <h2>{{ assignment.title }}</h2>
              <p>{{ assignment.description || uiCopy.emptyAssignmentDescription }}</p>
            </div>
            <div class="student-assignment-detail__requirement-tags">
              <span class="status-pill" :class="assignment.overdue ? 'status-pill--warning' : 'status-pill--success'">
                {{ assignment.overdue ? "已截止" : "提交开放" }}
              </span>
              <span class="status-pill" :class="studentAssignmentStatusTone(assignment)">
                {{ studentAssignmentStatusLabel(assignment) }}
              </span>
            </div>
          </div>
          <div
            class="student-assignment-detail__requirement student-assignment-detail__requirement--responsive student-assignment-detail__meta-band"
            data-testid="student-assignment-submission-requirement"
          >
            <span class="student-assignment-detail__requirement-item student-assignment-detail__requirement-item--mode">
              <strong>要求</strong>
              <span class="student-assignment-detail__requirement-value">{{ assignmentSubmissionRuleText }}</span>
            </span>
            <span class="student-assignment-detail__requirement-item student-assignment-detail__requirement-item--format">
              <strong>格式</strong>
              <span class="student-assignment-detail__requirement-value">{{ assignment.submissionConstraints.allowedTypesLabel }}</span>
            </span>
            <span class="student-assignment-detail__requirement-item student-assignment-detail__requirement-item--size">
              <strong>大小</strong>
              <span class="student-assignment-detail__requirement-value">单个文件不超过 {{ assignment.submissionConstraints.maxFileSizeLabel }}</span>
            </span>
            <span class="student-assignment-detail__requirement-item student-assignment-detail__requirement-item--due">
              <strong>截止</strong>
              <span class="student-assignment-detail__requirement-value">{{ formatStudentAssignmentDateTime(assignment.dueAt) }}</span>
            </span>
          </div>
          <div class="student-assignment-detail__support-strip">
            <div class="student-assignment-detail__attachment-block" data-testid="student-assignment-attachment-block">
              <div class="student-assignment-detail__panel-head">
                <h4>作业附件</h4>
                <p class="muted" v-if="!assignmentAttachments.length">{{ uiCopy.emptyStudentAttachments }}</p>
              </div>
              <ResourceList
                v-if="teacherAttachmentResources.length"
                :items="teacherAttachmentResources"
                test-id="student-assignment-attachment-list"
                item-test-id-prefix="student-assignment-attachment-row"
                link-test-id-prefix="student-assignment-attachment-link"
              />
            </div>
          </div>
        </article>

        <article class="student-assignment-detail__card student-assignment-detail__card--submission">
        <section
          v-if="!assignment.overdue"
          class="student-assignment-detail__submit-panel student-assignment-detail__submit"
          data-testid="student-assignment-submit-panel"
        >
          <div class="student-assignment-detail__submit-head">
            <div>
              <h3>{{ assignment.submission ? "添加到当前提交" : "提交作业" }}</h3>
            </div>
          </div>
          <div class="student-submission-actions">
            <button
              class="button button--primary student-submission-actions__primary"
              type="button"
              data-testid="student-submission-submit"
              @click="openSubmissionDialog"
            >
              {{ submitEntryButtonLabel }}
            </button>
            <p class="student-assignment-detail__submit-hint" data-testid="student-submission-picker-hint">
              {{ submissionPickerHint }}
            </p>
          </div>
          <p
            v-if="submissionFeedbackText"
            id="student-submission-submit-feedback"
            class="student-assignment-detail__submit-feedback"
            data-testid="student-submission-submit-feedback"
            aria-live="polite"
          >
            {{ submissionFeedbackText }}
          </p>
        </section>
        <section
          v-else
          class="student-assignment-detail__submit-panel student-assignment-detail__readonly"
        >
          <div class="student-assignment-detail__submit-head">
            <div>
              <h3>已截止，不能再提交</h3>
            </div>
            <span class="status-pill" :class="studentAssignmentStatusTone(assignment)">
              {{ studentAssignmentStatusLabel(assignment) }}
            </span>
          </div>
        </section>

        <section
          class="student-assignment-detail__current"
          data-testid="student-assignment-current-submission"
        >
          <div class="student-assignment-detail__panel-head">
            <div>
              <h3>当前提交</h3>
              <p class="muted" v-if="assignment.submission">更新：{{ formatStudentAssignmentDateTime(assignment.submission.updatedAt) }}</p>
              <p class="muted" v-else>{{ uiCopy.emptyStudentSubmissionFiles }}</p>
            </div>
            <div v-if="items.length" class="student-assignment-detail__file-toolbar">
              <div class="student-assignment-detail__file-view" role="group" aria-label="当前提交视图">
                <button
                  class="button"
                  :class="{ 'button--primary': currentSubmissionViewMode === 'list' }"
                  type="button"
                  data-testid="student-assignment-submission-view-list"
                  @click="setCurrentSubmissionViewMode('list')"
                >
                  列表
                </button>
                <button
                  class="button"
                  :class="{ 'button--primary': currentSubmissionViewMode === 'grid' }"
                  type="button"
                  data-testid="student-assignment-submission-view-grid"
                  @click="setCurrentSubmissionViewMode('grid')"
                >
                  网格
                </button>
              </div>
              <div
                v-if="currentSubmissionViewMode === 'grid'"
                class="student-assignment-detail__grid-size"
                data-testid="student-assignment-submission-grid-size-controls"
                role="group"
                aria-label="当前提交网格大小"
              >
                <button
                  class="button"
                  :class="{ 'button--primary': currentSubmissionGridSize === 'small' }"
                  type="button"
                  data-testid="student-assignment-submission-grid-size-small"
                  @click="setCurrentSubmissionGridSize('small')"
                >
                  小
                </button>
                <button
                  class="button"
                  :class="{ 'button--primary': currentSubmissionGridSize === 'medium' }"
                  type="button"
                  data-testid="student-assignment-submission-grid-size-medium"
                  @click="setCurrentSubmissionGridSize('medium')"
                >
                  中
                </button>
                <button
                  class="button"
                  :class="{ 'button--primary': currentSubmissionGridSize === 'large' }"
                  type="button"
                  data-testid="student-assignment-submission-grid-size-large"
                  @click="setCurrentSubmissionGridSize('large')"
                >
                  大
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="items.length && currentSubmissionViewMode === 'list'"
            class="student-assignment-detail__file-list"
            data-testid="student-assignment-submission-list"
          >
            <table class="files-table student-assignment-detail__file-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>类型</th>
                  <th>大小</th>
                  <th>路径</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in currentSubmissionFileRows"
                  :key="row.item.id"
                  :data-kind="row.item.kind"
                  :data-testid="`student-assignment-submission-row-${row.item.id}`"
                >
                  <td>
                    <div class="student-assignment-detail__file-name" :style="{ paddingLeft: `${row.depth * 18}px` }">
                      <strong>{{ row.item.name }}</strong>
                    </div>
                  </td>
                  <td>{{ currentSubmissionFileTypeLabel(row.item) }}</td>
                  <td>{{ formatSubmissionFileSize(row.item.size) ?? "文件" }}</td>
                  <td>
                    <span class="student-assignment-detail__file-meta">{{ currentSubmissionFilePathLabel(row.item) }}</span>
                  </td>
                  <td>
                    <div class="student-assignment-detail__file-actions">
                      <button
                        v-if="canPreviewCurrentSubmissionItem(row.item)"
                        class="text-button"
                        type="button"
                        :data-testid="`student-assignment-submission-preview-${row.item.id}`"
                        @click="openCurrentSubmissionPreview(row.item)"
                      >
                        预览
                      </button>
                      <a
                        class="text-button"
                        :href="currentSubmissionDownloadUrl(row.item)"
                        :data-testid="`student-assignment-submission-download-${row.item.id}`"
                      >
                  {{ row.item.kind === "dir" ? "下载压缩包" : "下载" }}
                      </a>
                      <button
                        v-if="canDeleteCurrentSubmissionItem(row.item)"
                        class="text-button text-button--danger"
                        type="button"
                        :data-testid="`student-assignment-submission-delete-${row.item.id}`"
                        @click="deleteCurrentSubmissionItem(row.item)"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <SubmissionFileGrid
            v-else-if="items.length"
            :items="items"
            :grid-size="currentSubmissionGridSize"
            test-id="student-assignment-submission-grid"
            item-test-id-prefix="student-assignment-submission-file"
            preview-test-id-prefix="student-assignment-submission-preview"
            thumbnail-test-id-prefix="student-assignment-submission-thumb"
            download-test-id-prefix="student-assignment-submission-download"
            delete-test-id-prefix="student-assignment-submission-delete"
            :deletable="canModifyCurrentSubmission"
            @preview="openCurrentSubmissionPreview"
            @delete="deleteCurrentSubmissionItem"
          />
        </section>
        </article>
        </section>

        <p v-if="errorText" class="form-error">{{ errorText }}</p>
      </template>
    </section>
    <FilePreviewDialog
      :item="currentPreviewItem"
      :kind="currentPreviewKind"
      :loading="currentPreviewLoading"
      :error-text="currentPreviewErrorText"
      :text-content="currentPreviewTextContent"
      :can-edit="false"
      :has-previous="currentPreviewHasPrevious"
      :has-next="currentPreviewHasNext"
      @close="closeCurrentSubmissionPreview"
      @previous="previewPreviousCurrentSubmission"
      @next="previewNextCurrentSubmission"
    />
    <div v-if="assignment && submissionDialogOpen" class="copy-dialog-backdrop">
      <section class="copy-dialog student-submission-dialog" data-testid="student-submission-dialog">
        <div class="copy-dialog__header">
          <div>
            <div class="copy-dialog__eyebrow">作业提交</div>
            <h3 class="copy-dialog__title">{{ assignment.submission ? "添加到当前提交" : "提交作业" }}</h3>
          </div>
          <button
            class="button button--ghost"
            type="button"
            data-testid="student-submission-dialog-close"
            @click="requestCloseSubmissionDialog"
          >
            关闭
          </button>
        </div>

        <div class="student-submission-dialog__body">
          <p class="student-submission-dialog__summary" data-testid="student-submission-dialog-summary">
            {{ submissionDialogSummary }}
          </p>

          <input
            v-if="canChooseFiles"
            :id="studentSubmissionFileInputId"
            ref="fileInput"
            class="student-submission-dialog__native-input"
            type="file"
            multiple
            :accept="submissionAccept"
            data-testid="student-submission-input"
            @change="handleFileChange"
          />
          <input
            v-if="canChooseDirectory"
            :id="studentSubmissionDirectoryInputId"
            ref="directoryInput"
            class="student-submission-dialog__native-input"
            type="file"
            webkitdirectory
            multiple
            :accept="submissionAccept"
            data-testid="student-submission-directory-input"
            @change="handleDirectoryChange"
          />

          <div class="student-submission-dialog__actions">
            <label
              v-if="canChooseFiles"
              class="button"
              :for="studentSubmissionFileInputId"
              data-testid="student-submission-file-open"
            >
              选择文件
            </label>
            <label
              v-if="canChooseDirectory"
              class="button"
              :for="studentSubmissionDirectoryInputId"
              data-testid="student-submission-directory-open"
            >
              选择文件夹
            </label>
            <button
              v-if="selectedFiles.length"
              class="button button--ghost"
              type="button"
              data-testid="student-submission-clear"
              @click="clearSelectedFiles"
            >
              清空重选
            </button>
          </div>

          <p class="student-assignment-detail__submit-hint">{{ submissionDialogHint }}</p>
          <p
            v-if="submissionDialogNotice"
            class="student-submission-dialog__notice"
            :class="{ 'student-submission-dialog__notice--error': selectedValidationError || errorText }"
            data-testid="student-submission-dialog-notice"
          >
            {{ submissionDialogNotice }}
          </p>

          <div
            v-if="selectedNames.length"
            class="student-assignment-detail__selection"
            data-testid="student-submission-selection"
          >
            <strong>{{ selectedSummaryText }}</strong>
            <ul>
              <li v-for="(name, index) in selectedNames" :key="`${name}-${index}`">
                <span>{{ name }}</span>
                <button
                  class="text-button text-button--danger"
                  type="button"
                  :data-testid="`student-submission-selected-remove-${index}`"
                  @click="removeSelectedFile(index)"
                >
                  移除
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div class="copy-dialog__actions">
          <button class="button" type="button" data-testid="student-submission-dialog-cancel" @click="requestCloseSubmissionDialog">
            取消
          </button>
          <button
            class="button button--primary"
            type="button"
            data-testid="student-submission-dialog-submit"
            :disabled="!canConfirmSelectedFiles"
            @click="requestSubmitConfirmation"
          >
            {{ assignment.submission ? "确认添加" : "确认提交" }}
          </button>
        </div>
      </section>
    </div>
    <ConfirmDialog
      :open="submitConfirmOpen"
      :title="assignment?.submission ? '确认添加文件' : '确认提交作业'"
      :message="submitConfirmMessage"
      test-id-prefix="student-submission-confirm"
      :confirm-label="assignment?.submission ? '确认添加' : '确认提交'"
      cancel-label="返回检查"
      @confirm="confirmSubmitAssignment"
      @cancel="submitConfirmOpen = false"
    />
    <ConfirmDialog
      :open="discardSelectionConfirmOpen"
      title="放弃本次选择"
      :message="discardSelectionMessage"
      test-id-prefix="student-submission-discard"
      confirm-label="放弃选择"
      cancel-label="继续检查"
      confirm-tone="danger"
      @confirm="confirmDiscardSelection"
      @cancel="discardSelectionConfirmOpen = false"
    />
    <ConfirmDialog
      :open="Boolean(pendingDeleteItem)"
      :title="pendingDeleteItem?.kind === 'dir' ? '确认删除提交文件夹' : '确认删除提交文件'"
      :message="deleteConfirmMessage"
      test-id-prefix="student-assignment-submission-delete-confirm"
      confirm-label="确认删除"
      cancel-label="取消"
      confirm-tone="danger"
      @confirm="confirmDeleteCurrentSubmissionItem"
      @cancel="pendingDeleteItem = null"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import type {
  AssignmentAttachmentItem,
  AssignmentSubmissionMode,
  AssignmentSubmissionTypeCategory,
  UploadFileItem,
} from "@/api/client";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import FilePreviewDialog from "@/components/FilePreviewDialog.vue";
import ResourceList from "@/components/ResourceList.vue";
import SubmissionFileGrid from "@/components/SubmissionFileGrid.vue";
import StatePanel from "@/components/StatePanel.vue";
import { formatStudentAssignmentDateTime } from "@/composables/useStudentAssignments";
import { useStudentAssignmentDetail } from "@/composables/useStudentAssignmentDetail";
import { getFilePreviewKind } from "@/utils/file-preview";
import { studentAssignmentStatusLabel, studentAssignmentStatusTone, uiCopy } from "@/utils/ui-copy";

const route = useRoute();

const selectedFiles = ref<UploadFileItem[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const directoryInput = ref<HTMLInputElement | null>(null);
const submissionDialogOpen = ref(false);
const submitConfirmOpen = ref(false);
const discardSelectionConfirmOpen = ref(false);
const pendingDeleteItem = ref<AssignmentAttachmentItem | null>(null);
const submissionFeedbackText = ref("");
const currentPreviewItem = ref<AssignmentAttachmentItem | null>(null);
const currentPreviewTextContent = ref("");
const currentPreviewLoading = ref(false);
const currentPreviewErrorText = ref("");
const currentPreviewTextCache = ref(new Map<number, string>());
const studentSubmissionFileInputId = "student-submission-file-input";
const studentSubmissionDirectoryInputId = "student-submission-directory-input";

const submissionTypeExtensions = {
  mixed: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".jpg", ".jpeg", ".png", ".zip", ".rar", ".7z"],
  image: [".jpg", ".jpeg", ".png"],
  word: [".doc", ".docx"],
  pdf: [".pdf"],
  archive: [".zip", ".rar", ".7z"],
} satisfies Record<AssignmentSubmissionTypeCategory, readonly string[]>;

type SubmissionFileViewMode = "grid" | "list";
type SubmissionFileGridSize = "small" | "medium" | "large";

interface SubmissionFileRow {
  item: AssignmentAttachmentItem;
  depth: number;
}

const assignmentId = computed(() => Number(route.params.assignmentId));
const selectedNames = computed(() => selectedFiles.value.map((item) => item.relativePath || item.file.name));
const {
  assignment,
  assignmentAttachments,
  items,
  loading,
  notFound,
  errorText,
  loadAssignment,
  submitAssignment: submitAssignmentFiles,
  deleteSubmissionFile,
} = useStudentAssignmentDetail(assignmentId);
const currentSubmissionViewMode = ref<SubmissionFileViewMode>("grid");
const currentSubmissionGridSize = ref<SubmissionFileGridSize>("medium");
const teacherAttachmentResources = computed(() => (
  mapResourceItems(assignmentAttachments.value)
));
const currentSubmissionFileRows = computed(() => flattenSubmissionFileRows(items.value));
const currentSubmissionPreviewItems = computed(() => (
  currentSubmissionFileRows.value
    .map((row) => row.item)
    .filter((item) => item.kind === "file" && getFilePreviewKind(item) !== "external")
));
const currentPreviewKind = computed(() => (currentPreviewItem.value ? getFilePreviewKind(currentPreviewItem.value) : null));
const currentPreviewIndex = computed(() => {
  const current = currentPreviewItem.value;
  return current ? currentSubmissionPreviewItems.value.findIndex((item) => item.id === current.id) : -1;
});
const currentPreviewHasPrevious = computed(() => currentPreviewIndex.value > 0);
const currentPreviewHasNext = computed(() => (
  currentPreviewIndex.value >= 0 && currentPreviewIndex.value < currentSubmissionPreviewItems.value.length - 1
));
const assignmentSubmissionRuleText = computed(() => {
  if (!assignment.value) {
    return "";
  }
  return formatAssignmentSubmissionRule(assignment.value.submissionMode, assignment.value.minFileCount);
});
const submitEntryButtonLabel = computed(() => (assignment.value?.submission ? "继续添加" : "选择并提交"));
const canChooseFiles = computed(() => assignment.value?.submissionMode !== "folder");
const canChooseDirectory = computed(() => assignment.value?.submissionMode !== "files");
const submissionAccept = computed(() => (
  submissionTypeExtensions[normalizeSubmissionTypeCategory(assignment.value?.submissionTypeCategory)].join(",")
));
const submissionPickerHint = computed(() => {
  return "在弹窗中选择文件，确认后才会提交。";
});
const submissionDialogHint = computed(() => {
  if (assignment.value?.submissionMode === "folder") {
    return "请选择整个文件夹，系统会保留目录结构。";
  }
  if (assignment.value?.submissionMode === "files") {
    return "本次只收文件，可一次选择多个。";
  }
  return "可选择文件或文件夹，确认后才会提交。";
});
const submissionDialogSummary = computed(() => {
  if (assignment.value?.submissionMode === "folder") {
    return "按左侧作业要求提交整个文件夹。";
  }
  if (assignment.value?.submissionMode === "files") {
    return "按左侧作业要求选择文件。";
  }
  return "按左侧作业要求选择文件或文件夹。";
});
const selectedFolderRootName = computed(() => {
  for (const item of selectedFiles.value) {
    const segments = uploadRelativePathSegments(item);
    if (segments.length > 1 && segments[0]) {
      return segments[0];
    }
  }
  return "";
});
const selectedSummaryText = computed(() => {
  if (selectedFolderRootName.value) {
    return `已选择文件夹：${selectedFolderRootName.value}（${selectedFiles.value.length} 个文件）`;
  }
  return `已选择：${selectedFiles.value.length} 个文件`;
});
const canModifyCurrentSubmission = computed(() => Boolean(assignment.value?.submission) && !assignment.value?.overdue);
const selectedValidationError = computed(() => {
  if (!selectedFiles.value.length) {
    return "";
  }
  return validateSelectedFiles(selectedFiles.value);
});
const canConfirmSelectedFiles = computed(() => selectedFiles.value.length > 0 && !selectedValidationError.value);
const submissionDialogNotice = computed(() => {
  if (errorText.value) {
    return errorText.value;
  }
  if (selectedValidationError.value) {
    return selectedValidationError.value;
  }
  if (!selectedFiles.value.length) {
    return "请先选择要提交的文件或文件夹。";
  }
  return "已选择内容，点确认后还会再次询问。";
});
const submitConfirmMessage = computed(() => {
  const action = assignment.value?.submission ? "添加" : "提交";
  return `确认${action}这 ${selectedFiles.value.length} 个文件？确认后会更新当前提交。`;
});
const discardSelectionMessage = computed(() => (
  `已选择 ${selectedFiles.value.length} 个文件，关闭后不会提交这些文件。`
));
const deleteConfirmMessage = computed(() => {
  const item = pendingDeleteItem.value;
  if (!item) {
    return "";
  }
  if (item.kind === "dir") {
    return `确认删除文件夹 ${item.name}？该文件夹下已提交的内容都会被删除。`;
  }
  return `确认删除文件 ${item.name}？`;
});

function mapResourceItems(items: AssignmentAttachmentItem[]) {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    href: item.kind === "dir" ? item.archiveUrl || item.downloadUrl : item.downloadUrl,
    meta: resourceMeta(item),
    openInNewTab: true,
  }));
}

function flattenSubmissionFileRows(items: AssignmentAttachmentItem[], depth = 0): SubmissionFileRow[] {
  const rows: SubmissionFileRow[] = [];
  for (const item of items) {
    rows.push({ item, depth });
    if (item.children?.length) {
      rows.push(...flattenSubmissionFileRows(item.children, depth + 1));
    }
  }
  return rows;
}

function setCurrentSubmissionViewMode(mode: SubmissionFileViewMode) {
  currentSubmissionViewMode.value = mode;
}

function setCurrentSubmissionGridSize(size: SubmissionFileGridSize) {
  currentSubmissionGridSize.value = size;
}

function currentSubmissionDownloadUrl(item: AssignmentAttachmentItem) {
  return item.kind === "dir" ? item.archiveUrl || item.downloadUrl : item.downloadUrl;
}

function currentSubmissionFileTypeLabel(item: AssignmentAttachmentItem) {
  return item.kind === "dir" ? "文件夹" : "文件";
}

function currentSubmissionFilePathLabel(item: AssignmentAttachmentItem) {
  const normalized = item.path.trim();
  if (!normalized || normalized === "/") {
    return "根目录";
  }
  return normalized;
}

function formatSubmissionFileSize(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return undefined;
  }
  if (value < 1024) {
    return `${value} B`;
  }
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  for (const unit of units) {
    if (size < 1024 || unit === units[units.length - 1]) {
      return `${size.toFixed(size >= 10 ? 0 : 1)} ${unit}`;
    }
    size /= 1024;
  }
  return `${value} B`;
}

function canPreviewCurrentSubmissionItem(item: AssignmentAttachmentItem) {
  return item.kind === "file" && getFilePreviewKind(item) !== "external";
}

function canDeleteCurrentSubmissionItem(_item: AssignmentAttachmentItem) {
  return canModifyCurrentSubmission.value;
}

function openSubmissionDialog() {
  submissionDialogOpen.value = true;
  submitConfirmOpen.value = false;
  discardSelectionConfirmOpen.value = false;
  errorText.value = "";
}

function resetSubmissionInputs() {
  if (fileInput.value) {
    fileInput.value.value = "";
  }
  if (directoryInput.value) {
    directoryInput.value.value = "";
  }
}

function clearSelectedFiles() {
  selectedFiles.value = [];
  resetSubmissionInputs();
}

function removeSelectedFile(index: number) {
  selectedFiles.value = selectedFiles.value.filter((_, currentIndex) => currentIndex !== index);
  if (!selectedFiles.value.length) {
    resetSubmissionInputs();
  }
}

function closeSubmissionDialog() {
  submissionDialogOpen.value = false;
  submitConfirmOpen.value = false;
  discardSelectionConfirmOpen.value = false;
  clearSelectedFiles();
}

function requestCloseSubmissionDialog() {
  if (selectedFiles.value.length) {
    discardSelectionConfirmOpen.value = true;
    return;
  }
  closeSubmissionDialog();
}

function confirmDiscardSelection() {
  discardSelectionConfirmOpen.value = false;
  closeSubmissionDialog();
}

function requestSubmitConfirmation() {
  if (!canConfirmSelectedFiles.value) {
    return;
  }
  submitConfirmOpen.value = true;
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedFiles.value = Array.from(input.files ?? []).map((file) => ({ file }));
  errorText.value = "";
  if (directoryInput.value) {
    directoryInput.value.value = "";
  }
}

function handleDirectoryChange(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedFiles.value = Array.from(input.files ?? []).map((file) => ({
    file,
    relativePath: file.webkitRelativePath || file.name,
  }));
  errorText.value = "";
  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

function resourceMeta(item: AssignmentAttachmentItem) {
  if (item.kind === "dir") {
    const folderText = item.folderCount ? `，${item.folderCount} 个子文件夹` : "";
    return `文件夹 · ${item.fileCount ?? 0} 个文件${folderText}`;
  }
  if (item.size > 0) {
    return `${Math.ceil(item.size / 1024)} KB`;
  }
  return "文件";
}

function previewSourceUrl(item: AssignmentAttachmentItem) {
  return item.previewUrl.trim() || item.downloadUrl.trim();
}

function toPreviewItem(item: AssignmentAttachmentItem) {
  return {
    ...item,
    previewUrl: previewSourceUrl(item),
  };
}

function closeCurrentSubmissionPreview() {
  currentPreviewItem.value = null;
  currentPreviewTextContent.value = "";
  currentPreviewLoading.value = false;
  currentPreviewErrorText.value = "";
}

async function openCurrentSubmissionPreview(item: AssignmentAttachmentItem | null) {
  if (!item || item.kind !== "file") {
    return;
  }
  const previewItem = toPreviewItem(item);
  const kind = getFilePreviewKind(previewItem);
  currentPreviewItem.value = previewItem;
  currentPreviewErrorText.value = "";
  currentPreviewTextContent.value = "";
  if (kind !== "text") {
    currentPreviewLoading.value = false;
    return;
  }
  const cached = currentPreviewTextCache.value.get(previewItem.id);
  if (cached !== undefined) {
    currentPreviewTextContent.value = cached;
    currentPreviewLoading.value = false;
    return;
  }
  currentPreviewLoading.value = true;
  try {
    const response = await fetch(previewItem.previewUrl, { credentials: "same-origin" });
    if (!response.ok) {
      throw new Error("preview_failed");
    }
    const text = await response.text();
    currentPreviewTextCache.value.set(previewItem.id, text);
    currentPreviewTextContent.value = text;
  } catch {
    currentPreviewErrorText.value = uiCopy.previewLoadFailed;
  } finally {
    currentPreviewLoading.value = false;
  }
}

async function previewPreviousCurrentSubmission() {
  if (!currentPreviewHasPrevious.value) {
    return;
  }
  const item = currentSubmissionPreviewItems.value[currentPreviewIndex.value - 1];
  await openCurrentSubmissionPreview(item ?? null);
}

async function previewNextCurrentSubmission() {
  if (!currentPreviewHasNext.value) {
    return;
  }
  const item = currentSubmissionPreviewItems.value[currentPreviewIndex.value + 1];
  await openCurrentSubmissionPreview(item ?? null);
}

function formatAssignmentSubmissionRule(mode: AssignmentSubmissionMode, minFileCount: number) {
  const parts = [submissionModeLabel(mode)];
  const normalizedMinFileCount = normalizeMinFileCount(minFileCount);
  parts.push(`至少 ${normalizedMinFileCount} 个文件`);
  return parts.join("，");
}

function submissionModeLabel(mode: AssignmentSubmissionMode) {
  if (mode === "folder") {
    return "文件夹";
  }
  if (mode === "files") {
    return "文件";
  }
  return "不限";
}

function normalizeMinFileCount(value: number) {
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function normalizeSubmissionTypeCategory(value: AssignmentSubmissionTypeCategory | undefined) {
  if (value === "image" || value === "word" || value === "pdf" || value === "archive" || value === "mixed") {
    return value;
  }
  return "mixed";
}

function uploadRelativePathSegments(item: UploadFileItem) {
  const normalized = (item.relativePath ?? "").trim().replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized) {
    return [];
  }
  return normalized.split("/").filter(Boolean);
}

function selectedFileExtension(item: UploadFileItem) {
  const fileName = item.file.name.trim();
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) {
    return "";
  }
  return fileName.slice(dotIndex).toLowerCase();
}

function formatAllowedTypesError(label: string) {
  const normalizedLabel = label.trim();
  if (!normalizedLabel) {
    return "文件格式不符合本次作业要求";
  }
  if (normalizedLabel.includes("文件") || normalizedLabel.includes("文档") || normalizedLabel.includes("压缩包")) {
    return `仅支持${normalizedLabel}`;
  }
  return `仅支持 ${normalizedLabel} 文件`;
}

function validateSelectedFiles(files: UploadFileItem[]) {
  if (!assignment.value || !files.length) {
    return "";
  }
  const mode = assignment.value.submissionMode;
  if (mode === "folder") {
    let rootName = "";
    for (const item of files) {
      const segments = uploadRelativePathSegments(item);
      if (segments.length < 2) {
        return "本次作业要求提交一个文件夹";
      }
      if (!rootName) {
        rootName = segments[0] ?? "";
      } else if (segments[0] !== rootName) {
        return "本次作业只能提交一个文件夹";
      }
    }
  }
  if (mode === "files" && files.some((item) => uploadRelativePathSegments(item).length > 1)) {
    return "本次作业要求提交文件，不要选择文件夹";
  }
  const category = normalizeSubmissionTypeCategory(assignment.value.submissionTypeCategory);
  const allowedExtensions = submissionTypeExtensions[category];
  const hasInvalidType = files.some((item) => !allowedExtensions.includes(selectedFileExtension(item)));
  if (hasInvalidType) {
    return formatAllowedTypesError(assignment.value.submissionConstraints.allowedTypesLabel);
  }
  return "";
}

async function submitAssignment() {
  if (!assignment.value) {
    return;
  }
  if (!selectedFiles.value.length) {
    errorText.value = "请先选择要提交的文件或文件夹";
    return;
  }
  const validationError = validateSelectedFiles(selectedFiles.value);
  if (validationError) {
    errorText.value = validationError;
    return;
  }
  const hadSubmission = Boolean(assignment.value.submission);
  await submitAssignmentFiles(selectedFiles.value);
  if (!errorText.value) {
    submissionFeedbackText.value = hadSubmission ? "已添加，当前提交已更新。" : "已提交，当前提交已更新。";
    closeSubmissionDialog();
  }
}

async function confirmSubmitAssignment() {
  submitConfirmOpen.value = false;
  await submitAssignment();
}

function deleteCurrentSubmissionItem(item: AssignmentAttachmentItem) {
  if (!canDeleteCurrentSubmissionItem(item)) {
    return;
  }
  pendingDeleteItem.value = item;
}

async function confirmDeleteCurrentSubmissionItem() {
  const item = pendingDeleteItem.value;
  if (!item || !canDeleteCurrentSubmissionItem(item)) {
    pendingDeleteItem.value = null;
    return;
  }
  pendingDeleteItem.value = null;
  await deleteSubmissionFile(item.id);
  if (!errorText.value) {
    submissionFeedbackText.value = "已删除，当前提交已更新。";
  }
}

onMounted(async () => {
  await loadAssignment();
});
</script>

<style scoped>
.student-assignment-detail__board {
  gap: 0;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.student-assignment-detail__split {
  display: grid;
  grid-template-columns: minmax(400px, 520px) minmax(420px, 1fr);
  gap: 12px;
  align-items: start;
}

.student-assignment-detail__card {
  display: grid;
  gap: 14px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  background: var(--bg-surface);
  box-shadow: var(--shadow-soft);
}

.student-assignment-detail__card--submission {
  gap: 0;
}

.student-assignment-detail__submit-panel,
.student-assignment-detail__current {
  display: grid;
  gap: 12px;
}

.student-assignment-detail__submit-panel {
  padding-bottom: 14px;
}

.student-assignment-detail__current {
  padding-top: 14px;
  border-top: 1px solid var(--border-soft);
}

.student-assignment-detail__readonly {
  color: var(--text-primary);
}

.student-assignment-detail__submit-head,
.student-assignment-detail__panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.student-assignment-detail__submit-head h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.28rem;
  line-height: 1.25;
}

.student-assignment-detail__panel-head h3,
.student-assignment-detail__panel-head h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.student-assignment-detail__panel-head p {
  margin: 0;
}

.student-assignment-detail__overview-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: start;
}

.student-assignment-detail__hero {
  padding: 0 0 2px;
}

.student-assignment-detail__overview-copy {
  min-width: 0;
}

.student-assignment-detail__overview-copy h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.28rem;
  line-height: 1.25;
}

.student-assignment-detail__overview-copy p {
  max-width: 74ch;
  margin: 7px 0 0;
  color: var(--text-secondary);
  line-height: 1.5;
}

.student-assignment-detail__requirement {
  display: grid;
  gap: 12px 14px;
  padding: 12px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--bg-subtle);
}

.student-assignment-detail__requirement--responsive {
  grid-template-columns: minmax(150px, 1fr) minmax(260px, 2fr) minmax(190px, 1.1fr) minmax(150px, 0.8fr);
}

.student-assignment-detail__card--info .student-assignment-detail__requirement--responsive {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.student-assignment-detail__card--info .student-assignment-detail__requirement-item--due {
  grid-column: 1 / -1;
}

.student-assignment-detail__card--info .student-assignment-detail__requirement-item--size .student-assignment-detail__requirement-value {
  white-space: nowrap;
  overflow-wrap: normal;
}

.student-assignment-detail__requirement-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 6px;
  align-items: start;
  min-width: 0;
  color: var(--text-secondary);
  font-size: 0.94rem;
  line-height: 1.5;
}

.student-assignment-detail__requirement-item--format {
  min-width: 0;
  grid-column: 1 / -1;
}

.student-assignment-detail__requirement strong {
  color: var(--text-primary);
}

.student-assignment-detail__requirement-value {
  min-width: 0;
  overflow-wrap: anywhere;
}

.student-assignment-detail__support-strip {
  display: grid;
  gap: 10px;
}

.student-assignment-detail__attachment-block {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--bg-subtle);
  width: 100%;
}

.student-assignment-detail__requirement-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  align-items: center;
}

.student-submission-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.student-submission-actions__primary {
  min-width: 116px;
}

.student-assignment-detail__submit-hint {
  flex: 1 1 260px;
  margin: 0;
  color: var(--text-muted);
  font-size: 0.94rem;
  line-height: 1.45;
}

.student-assignment-detail__selection {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--bg-subtle);
}

.student-assignment-detail__selection strong {
  color: var(--text-primary);
}

.student-assignment-detail__selection ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--text-secondary);
  line-height: 1.45;
}

.student-assignment-detail__selection li {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.student-assignment-detail__selection li span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.student-assignment-detail__submit-feedback {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.94rem;
  line-height: 1.45;
}

.student-assignment-detail__file-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.student-assignment-detail__file-view,
.student-assignment-detail__grid-size {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.student-assignment-detail__file-toolbar .button {
  min-height: 32px;
  padding: 5px 11px;
  border-radius: 10px;
}

.student-assignment-detail__file-list {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--bg-surface);
}

.student-assignment-detail__file-table {
  min-width: 640px;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.student-assignment-detail__file-table th {
  background: var(--bg-subtle);
  color: var(--text-muted);
  font-size: 0.94rem;
  font-weight: 800;
}

.student-assignment-detail__file-table th,
.student-assignment-detail__file-table td {
  padding: 7px 9px;
  vertical-align: middle;
}

.student-assignment-detail__file-name,
.student-assignment-detail__file-meta {
  min-width: 0;
  overflow-wrap: anywhere;
}

.student-assignment-detail__file-name strong {
  color: var(--text-primary);
}

.student-assignment-detail__file-meta {
  display: block;
  color: var(--text-secondary);
  font-size: 0.96rem;
}

.student-assignment-detail__file-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.student-submission-dialog {
  width: min(720px, calc(100vw - 32px));
}

.student-submission-dialog__body {
  display: grid;
  gap: 12px;
}

.student-submission-dialog__summary {
  margin: 0;
  padding: 12px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--modal-subtle);
  color: var(--text-secondary);
  line-height: 1.45;
}

.student-submission-dialog__native-input {
  position: fixed;
  inline-size: 1px;
  block-size: 1px;
  opacity: 0;
  pointer-events: none;
}

.student-submission-dialog .button:disabled,
.student-submission-dialog .button:disabled:hover {
  transform: none;
  border-color: var(--border-soft);
  background: var(--bg-subtle);
  color: var(--text-muted);
  cursor: not-allowed;
  box-shadow: none;
}

.student-submission-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.student-submission-dialog__notice {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.45;
}

.student-submission-dialog__notice--error {
  color: var(--danger);
}

@media (max-width: 1080px) {
  .student-assignment-detail__split {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .student-assignment-detail__submit-head,
  .student-assignment-detail__panel-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .student-assignment-detail__overview-main {
    grid-template-columns: minmax(0, 1fr);
  }

  .student-assignment-detail__requirement-tags {
    justify-content: flex-start;
    min-width: 0;
  }

  .student-assignment-detail__file-toolbar {
    justify-content: flex-start;
  }
}

@media (max-width: 920px) {
  .student-assignment-detail__requirement--responsive {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .student-assignment-detail__requirement-item--format {
    grid-column: 1 / -1;
  }
}

@media (max-width: 560px) {
  .student-assignment-detail__requirement--responsive {
    grid-template-columns: minmax(0, 1fr);
  }

  .student-assignment-detail__requirement-item--format {
    grid-column: auto;
  }

}
</style>

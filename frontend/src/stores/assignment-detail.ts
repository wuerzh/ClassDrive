import { defineStore } from "pinia";
import {
  api,
  ApiError,
  type AssignmentAttachmentItem,
  type AssignmentItem,
  type AssignmentSubmissionMode,
  type AssignmentSubmissionTypeCategory,
  type AssignmentSubmissionListQueryOptions,
  type AssignmentSubmissionItem,
  type PaginationPayload,
} from "@/api/client";
import { useAssignmentsStore } from "@/stores/assignments";

export type AssignmentSubmissionSort = "updatedAt-desc" | "updatedAt-asc" | "studentNo-asc" | "studentNo-desc" | "displayName-asc" | "displayName-desc";

interface SubmissionReviewDraft {
  reviewStatus: "pending" | "reviewed";
  teacherComment: string;
}

function toDateTimeLocal(value: string) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  const offset = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 16);
}

function cloneAssignment(item: AssignmentItem): AssignmentItem {
  return {
    id: item.id,
    classId: item.classId,
    title: item.title,
    description: item.description,
    dueAt: item.dueAt,
    status: item.status,
    submissionMode: item.submissionMode,
    submissionTypeCategory: item.submissionTypeCategory ?? "mixed",
    minFileCount: item.minFileCount,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function cloneAttachment(item: AssignmentAttachmentItem): AssignmentAttachmentItem {
  return {
    id: item.id,
    name: item.name,
    path: item.path,
    kind: item.kind,
    size: item.size,
    downloadUrl: item.downloadUrl,
    archiveUrl: item.archiveUrl,
    previewUrl: item.previewUrl,
    fileCount: item.fileCount,
    folderCount: item.folderCount,
    children: item.children?.map(cloneAttachment),
  };
}

function cloneSubmission(item: AssignmentSubmissionItem): AssignmentSubmissionItem {
  return {
    id: item.id,
    studentId: item.studentId,
    studentNo: item.studentNo,
    displayName: item.displayName,
    status: item.status,
    submittedAt: item.submittedAt,
    updatedAt: item.updatedAt,
    reviewStatus: item.reviewStatus,
    teacherCommentSummary: item.teacherCommentSummary,
    reviewedAt: item.reviewedAt,
    reviewerName: item.reviewerName,
    items: item.items.map(cloneAttachment),
  };
}

function buildSubmissionReviewDrafts(items: AssignmentSubmissionItem[]) {
  return Object.fromEntries(
    items.map((submission) => [
      submission.id,
      {
        reviewStatus: submission.reviewStatus,
        teacherComment: submission.teacherCommentSummary,
      } satisfies SubmissionReviewDraft,
    ]),
  ) as Record<number, SubmissionReviewDraft>;
}

export const useAssignmentDetailStore = defineStore("assignment-detail", {
  state: () => ({
    assignment: null as AssignmentItem | null,
    attachments: [] as AssignmentAttachmentItem[],
    submissions: [] as AssignmentSubmissionItem[],
    submissionReviewDrafts: {} as Record<number, SubmissionReviewDraft>,
    submissionFilter: "",
    submissionSort: "updatedAt-desc" as AssignmentSubmissionSort,
    submissionPage: 1,
    submissionPageSize: 8,
    submissionTotal: 0,
    submissionTotalPages: 1,
    activeSubmissionId: null as number | null,
    editTitle: "",
    editDescription: "",
    editDueAt: "",
    editStatus: "draft" as "draft" | "published",
    editSubmissionMode: "any" as AssignmentSubmissionMode,
    editSubmissionTypeCategory: "mixed" as AssignmentSubmissionTypeCategory,
    editMinFileCount: 1,
    loading: false,
    notFound: false,
    attachmentsLoading: false,
    submissionsLoading: false,
    currentClassId: null as number | null,
    currentAssignmentId: null as number | null,
  }),
  getters: {
    visibleSubmissions: (state) => state.submissions,
    activeSubmissionIndex(): number {
      return this.visibleSubmissions.findIndex((submission) => submission.id === this.activeSubmissionId);
    },
  },
  actions: {
    resetEditForm() {
      this.editTitle = "";
      this.editDescription = "";
      this.editDueAt = "";
      this.editStatus = "draft";
      this.editSubmissionMode = "any";
      this.editSubmissionTypeCategory = "mixed";
      this.editMinFileCount = 1;
    },
    syncEditForm(item: AssignmentItem) {
      this.editTitle = item.title;
      this.editDescription = item.description;
      this.editDueAt = toDateTimeLocal(item.dueAt);
      this.editStatus = item.status;
      this.editSubmissionMode = item.submissionMode;
      this.editSubmissionTypeCategory = item.submissionTypeCategory ?? "mixed";
      this.editMinFileCount = item.minFileCount;
    },
    reconcileActiveSubmission() {
      if (this.visibleSubmissions.length === 0) {
        this.activeSubmissionId = null;
        return;
      }
      if (!this.visibleSubmissions.some((submission) => submission.id === this.activeSubmissionId)) {
        this.activeSubmissionId = this.visibleSubmissions[0]?.id ?? null;
      }
    },
    clear() {
      this.assignment = null;
      this.attachments = [];
      this.submissions = [];
      this.submissionReviewDrafts = {};
      this.submissionFilter = "";
      this.submissionSort = "updatedAt-desc";
      this.submissionPage = 1;
      this.submissionPageSize = 8;
      this.submissionTotal = 0;
      this.submissionTotalPages = 1;
      this.activeSubmissionId = null;
      this.resetEditForm();
      this.loading = false;
      this.notFound = false;
      this.attachmentsLoading = false;
      this.submissionsLoading = false;
      this.currentClassId = null;
      this.currentAssignmentId = null;
    },
    setAssignment(item: AssignmentItem | null) {
      this.assignment = item ? cloneAssignment(item) : null;
      if (item) {
        this.syncEditForm(item);
        const assignmentsStore = useAssignmentsStore();
        const currentItems = assignmentsStore.listForClass(item.classId);
        if (currentItems.length > 0) {
          assignmentsStore.setClassAssignments(
            item.classId,
            currentItems.map((current) => (current.id === item.id ? cloneAssignment(item) : current)),
          );
        }
        return;
      }
      this.resetEditForm();
    },
    setAttachments(items: AssignmentAttachmentItem[]) {
      this.attachments = items.map(cloneAttachment);
    },
    setSubmissions(items: AssignmentSubmissionItem[], pagination?: PaginationPayload) {
      this.submissions = items.map(cloneSubmission);
      this.submissionReviewDrafts = buildSubmissionReviewDrafts(this.submissions);
      this.submissionPage = pagination?.page ?? 1;
      this.submissionPageSize = pagination?.pageSize ?? this.submissions.length;
      this.submissionTotal = pagination?.total ?? this.submissions.length;
      this.submissionTotalPages = Math.max(1, pagination?.totalPages ?? 1);
      this.reconcileActiveSubmission();
    },
    setSubmissionFilter(value: string) {
      this.submissionFilter = value;
      this.reconcileActiveSubmission();
    },
    setSubmissionSort(value: AssignmentSubmissionSort) {
      this.submissionSort = value;
      this.reconcileActiveSubmission();
    },
    setSubmissionPageState(page: number, pageSize: number) {
      this.submissionPage = page;
      this.submissionPageSize = pageSize;
    },
    setActiveSubmission(submissionID: number | null) {
      this.activeSubmissionId = submissionID;
      this.reconcileActiveSubmission();
    },
    selectPrevSubmission() {
      if (this.activeSubmissionIndex <= 0) {
        return;
      }
      this.activeSubmissionId = this.visibleSubmissions[this.activeSubmissionIndex - 1]?.id ?? null;
    },
    selectNextSubmission() {
      if (this.activeSubmissionIndex < 0 || this.activeSubmissionIndex >= this.visibleSubmissions.length - 1) {
        return;
      }
      this.activeSubmissionId = this.visibleSubmissions[this.activeSubmissionIndex + 1]?.id ?? null;
    },
    async loadAssignment(classId: number, assignmentId: number) {
      this.currentClassId = classId;
      this.currentAssignmentId = assignmentId;
      try {
        const assignment = await api.assignment(assignmentId, classId);
        this.setAssignment(assignment);
        this.notFound = false;
        return this.assignment;
      } catch (error) {
        this.assignment = null;
        throw error;
      }
    },
    async loadAttachments(classId: number, assignmentId: number) {
      this.attachmentsLoading = true;
      try {
        const response = await api.assignmentAttachments(assignmentId, classId);
        this.setAttachments(response.items ?? []);
        return this.attachments;
      } finally {
        this.attachmentsLoading = false;
      }
    },
    async loadSubmissions(classId: number, assignmentId: number, options: Partial<AssignmentSubmissionListQueryOptions> = {}) {
      this.submissionsLoading = true;
      try {
        const response = await api.assignmentSubmissions(assignmentId, {
          ...options,
          classId,
        });
        this.setSubmissions(response.submissions ?? [], response.pagination);
        return this.submissions;
      } finally {
        this.submissionsLoading = false;
      }
    },
    async loadPage(classId: number, assignmentId: number, submissionOptions: Partial<AssignmentSubmissionListQueryOptions> = {}) {
      this.loading = true;
      this.currentClassId = classId;
      this.currentAssignmentId = assignmentId;
      try {
        await this.loadAssignment(classId, assignmentId);
        await this.loadAttachments(classId, assignmentId);
        await this.loadSubmissions(classId, assignmentId, submissionOptions);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          this.assignment = null;
          this.attachments = [];
          this.submissions = [];
          this.submissionReviewDrafts = {};
          this.activeSubmissionId = null;
          this.resetEditForm();
          this.notFound = true;
          return null;
        }
        throw error;
      } finally {
        this.loading = false;
      }
      return this.assignment;
    },
    async saveAssignment(payload: {
      classId: number;
      assignmentId: number;
      title: string;
      description: string;
      dueAt: string;
      status: "draft" | "published";
      submissionMode: AssignmentSubmissionMode;
      submissionTypeCategory: AssignmentSubmissionTypeCategory;
      minFileCount: number;
    }) {
      const updated = await api.updateAssignment(payload);
      this.setAssignment(updated);
      return this.assignment;
    },
    async deleteAssignment(classId: number, assignmentId: number) {
      await api.deleteAssignment(assignmentId, classId);
      const assignmentsStore = useAssignmentsStore();
      const currentItems = assignmentsStore.listForClass(classId);
      if (currentItems.length > 0) {
        assignmentsStore.setClassAssignments(
          classId,
          currentItems.filter((item) => item.id !== assignmentId),
        );
      }
      this.clear();
    },
    async uploadAttachments(payload: { classId: number; assignmentId: number; files: File[] }) {
      const response = await api.uploadAssignmentAttachments(payload);
      const nextItems = [...this.attachments, ...((response.items ?? []).map(cloneAttachment))];
      this.attachments = nextItems;
      return this.attachments;
    },
    async deleteAttachment(classId: number, assignmentId: number, fileId: number) {
      await api.deleteAssignmentAttachment(assignmentId, classId, fileId);
      this.attachments = this.attachments.filter((item) => item.id !== fileId);
    },
    async saveSubmissionReview(payload: {
      classId: number;
      assignmentId: number;
      submissionId: number;
      reviewStatus: "pending" | "reviewed";
      teacherComment: string;
    }) {
      const updated = await api.reviewAssignmentSubmission(payload);
      this.submissions = this.submissions.map((item) => (item.id === payload.submissionId ? cloneSubmission(updated) : item));
      this.submissionReviewDrafts[payload.submissionId] = {
        reviewStatus: updated.reviewStatus,
        teacherComment: updated.teacherCommentSummary,
      };
      return updated;
    },
  },
});

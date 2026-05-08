import { ref, type ComputedRef } from "vue";
import { api, ApiError, type AssignmentAttachmentItem, type StudentAssignmentDetail, type UploadFileItem } from "@/api/client";

export function useStudentAssignmentDetail(assignmentId: ComputedRef<number>) {
  const assignment = ref<StudentAssignmentDetail | null>(null);
  const assignmentAttachments = ref<AssignmentAttachmentItem[]>([]);
  const items = ref<AssignmentAttachmentItem[]>([]);
  const loading = ref(true);
  const notFound = ref(false);
  const errorText = ref("");

  async function loadAssignment() {
    loading.value = true;
    errorText.value = "";
    notFound.value = false;
    try {
      const response = await api.studentAssignment(assignmentId.value);
      const normalizedAssignment = {
        ...response,
        assignmentAttachments: response.assignmentAttachments ?? [],
        items: response.items ?? [],
      };
      assignment.value = normalizedAssignment;
      assignmentAttachments.value = normalizedAssignment.assignmentAttachments;
      items.value = normalizedAssignment.items;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        notFound.value = true;
        assignment.value = null;
        assignmentAttachments.value = [];
        items.value = [];
        return;
      }
      errorText.value = error instanceof ApiError ? error.message : "加载作业详情失败";
    } finally {
      loading.value = false;
    }
  }

  async function submitAssignment(files: UploadFileItem[]) {
    if (!assignment.value) {
      return;
    }
    if (!files.length) {
      errorText.value = "请先选择文件";
      return;
    }

    errorText.value = "";
    try {
      const response = await api.submitStudentAssignment({
        assignmentId: assignmentId.value,
        files,
      });
      assignment.value = {
        ...assignment.value,
        submission: response.submission,
      };
      items.value = response.items;
    } catch (error) {
      errorText.value = error instanceof ApiError ? error.message : "提交失败";
    }
  }

  return {
    assignment,
    assignmentAttachments,
    items,
    loading,
    notFound,
    errorText,
    loadAssignment,
    submitAssignment,
  };
}

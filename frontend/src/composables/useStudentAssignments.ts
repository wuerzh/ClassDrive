import { ref } from "vue";
import { api, ApiError, type StudentAssignmentItem, type StudentSubmissionConstraints } from "@/api/client";
import { studentAssignmentStatusLabel, uiCopy } from "@/utils/ui-copy";

export function formatStudentAssignmentDateTime(value: string) {
  if (!value) {
    return uiCopy.emptyValue;
  }
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
  });
}

export function getStudentAssignmentStatusText(assignment: StudentAssignmentItem) {
  return studentAssignmentStatusLabel(assignment);
}

export function useStudentAssignments() {
  const assignments = ref<StudentAssignmentItem[]>([]);
  const submissionConstraints = ref<StudentSubmissionConstraints>({
    allowedTypesLabel: "",
    maxFileSizeBytes: 0,
    maxFileSizeLabel: "",
  });
  const loading = ref(true);
  const errorText = ref("");

  async function loadAssignments() {
    loading.value = true;
    errorText.value = "";
    try {
      const response = await api.studentAssignments();
      assignments.value = response.assignments ?? [];
      submissionConstraints.value = response.submissionConstraints ?? submissionConstraints.value;
    } catch (error) {
      errorText.value = error instanceof ApiError ? error.message : "加载作业失败";
    } finally {
      loading.value = false;
    }
  }

  return {
    assignments,
    submissionConstraints,
    loading,
    errorText,
    loadAssignments,
  };
}

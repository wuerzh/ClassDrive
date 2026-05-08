import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { ApiError, api } from "@/api/client";
import { useAssignmentDetailStore } from "@/stores/assignment-detail";
import { useAssignmentsStore } from "@/stores/assignments";

describe("assignment detail store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("loads page data and marks not found on 404", async () => {
    const assignmentDetailStore = useAssignmentDetailStore();
    vi.spyOn(api, "assignment").mockRejectedValue(new ApiError(404, "not_found", "作业不存在"));

    await expect(assignmentDetailStore.loadPage(2, 9)).resolves.toBeNull();
    expect(assignmentDetailStore.notFound).toBe(true);
    expect(assignmentDetailStore.assignment).toBeNull();
    expect(assignmentDetailStore.attachments).toEqual([]);
    expect(assignmentDetailStore.submissions).toEqual([]);
  });

  it("syncs assignment, attachments and submission review back into store state", async () => {
    const assignmentDetailStore = useAssignmentDetailStore();
    const assignmentsStore = useAssignmentsStore();
    assignmentsStore.setClassAssignments(2, [
      {
        id: 9,
        classId: 2,
        title: "旧标题",
        description: "旧说明",
        dueAt: "",
        status: "draft",
        createdAt: "2026-04-23T10:00:00Z",
        updatedAt: "2026-04-23T10:30:00Z",
      },
    ]);
    vi.spyOn(api, "assignment").mockResolvedValue({
      id: 9,
      classId: 2,
      title: "单元复习",
      description: "完成第 8 页题目",
      dueAt: "2026-05-01T12:00:00Z",
      status: "published",
      createdAt: "2026-04-23T10:00:00Z",
      updatedAt: "2026-04-23T10:30:00Z",
    });
    vi.spyOn(api, "assignmentAttachments").mockResolvedValue({
      items: [
        {
          id: 101,
          name: "习题答案.pdf",
          path: "/9/习题答案.pdf",
          kind: "file",
          size: 12345,
          downloadUrl: "/api/assignments/9/attachments/101/download?classId=2",
          previewUrl: "",
        },
      ],
    });
    vi.spyOn(api, "assignmentSubmissions").mockResolvedValue({
      submissions: [
        {
          id: 12,
          studentId: 3,
          studentNo: "20260001",
          displayName: "张小明",
          status: "submitted",
          submittedAt: "2026-04-30T08:00:00Z",
          updatedAt: "2026-04-30T08:30:00Z",
          reviewStatus: "pending",
          teacherCommentSummary: "",
          reviewedAt: "",
          reviewerName: "",
          items: [],
        },
      ],
      submissionConstraints: {
        allowedTypesLabel: "",
        maxFileSizeBytes: 0,
        maxFileSizeLabel: "",
      },
    });
    vi.spyOn(api, "updateAssignment").mockResolvedValue({
      id: 9,
      classId: 2,
      title: "单元复习-修订版",
      description: "新的作业说明",
      dueAt: "2026-05-03T12:00:00Z",
      status: "draft",
      createdAt: "2026-04-23T10:00:00Z",
      updatedAt: "2026-04-23T11:00:00Z",
    });
    vi.spyOn(api, "uploadAssignmentAttachments").mockResolvedValue({
      items: [
        {
          id: 102,
          name: "补充说明.txt",
          path: "/9/补充说明.txt",
          kind: "file",
          size: 12,
          downloadUrl: "/api/assignments/9/attachments/102/download?classId=2",
          previewUrl: "",
        },
      ],
    });
    vi.spyOn(api, "reviewAssignmentSubmission").mockResolvedValue({
      id: 12,
      studentId: 3,
      studentNo: "20260001",
      displayName: "张小明",
      status: "submitted",
      submittedAt: "2026-04-30T08:00:00Z",
      updatedAt: "2026-04-30T08:30:00Z",
      reviewStatus: "reviewed",
      teacherCommentSummary: "书写清晰",
      reviewedAt: "2026-04-30T09:30:00Z",
      reviewerName: "示例老师",
      items: [],
    });
    vi.spyOn(api, "deleteAssignmentAttachment").mockResolvedValue({ ok: true });

    await assignmentDetailStore.loadPage(2, 9);
    await assignmentDetailStore.saveAssignment({
      classId: 2,
      assignmentId: 9,
      title: "单元复习-修订版",
      description: "新的作业说明",
      dueAt: "2026-05-03T12:00:00Z",
      status: "draft",
    });
    await assignmentDetailStore.uploadAttachments({
      classId: 2,
      assignmentId: 9,
      files: [new File(["body"], "补充说明.txt", { type: "text/plain" })],
    });
    await assignmentDetailStore.saveSubmissionReview({
      classId: 2,
      assignmentId: 9,
      submissionId: 12,
      reviewStatus: "reviewed",
      teacherComment: "书写清晰",
    });
    await assignmentDetailStore.deleteAttachment(2, 9, 101);

    expect(assignmentDetailStore.assignment?.title).toBe("单元复习-修订版");
    expect(assignmentsStore.listForClass(2)[0]?.title).toBe("单元复习-修订版");
    expect(assignmentDetailStore.attachments).toEqual([
      {
        id: 102,
        name: "补充说明.txt",
        path: "/9/补充说明.txt",
        kind: "file",
        size: 12,
        downloadUrl: "/api/assignments/9/attachments/102/download?classId=2",
        previewUrl: "",
      },
    ]);
    expect(assignmentDetailStore.submissionReviewDrafts[12]).toEqual({
      reviewStatus: "reviewed",
      teacherComment: "书写清晰",
    });
  });
});

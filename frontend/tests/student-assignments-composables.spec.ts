import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed } from "vue";
import { useStudentAssignments, getStudentAssignmentStatusText } from "@/composables/useStudentAssignments";
import { useStudentAssignmentDetail } from "@/composables/useStudentAssignmentDetail";

describe("student assignment composables", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads student assignments and computes status text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        assignments: [
          {
            id: 9,
            classId: 1,
            title: "第一单元练习",
            description: "完成第 8 页",
            dueAt: "2026-05-01T12:00:00Z",
            status: "published",
            createdAt: "2026-04-23T10:00:00Z",
            updatedAt: "2026-04-23T10:30:00Z",
            overdue: false,
            submission: null,
          },
          {
            id: 10,
            classId: 1,
            title: "第二单元练习",
            description: "已截止已提交",
            dueAt: "2026-04-20T12:00:00Z",
            status: "published",
            createdAt: "2026-04-20T10:00:00Z",
            updatedAt: "2026-04-20T10:30:00Z",
            overdue: true,
            submission: {
              id: 2,
              status: "submitted",
              submittedAt: "2026-04-19T08:00:00Z",
              updatedAt: "2026-04-19T08:00:00Z",
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const state = useStudentAssignments();
    await state.loadAssignments();

    expect(state.assignments.value).toHaveLength(2);
    expect(getStudentAssignmentStatusText(state.assignments.value[0])).toBe("未提交");
    expect(getStudentAssignmentStatusText(state.assignments.value[1])).toBe("已截止（已提交）");
  });

  it("loads detail and refreshes current submission after submit", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 9,
          classId: 1,
          title: "第一单元练习",
          description: "完成第 8 页",
          dueAt: "2026-05-01T12:00:00Z",
          status: "published",
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
          overdue: false,
          submission: null,
          submissionConstraints: {
            allowedTypesLabel: "PDF、Word、Excel、PPT、TXT、JPG、PNG、ZIP",
            maxFileSizeBytes: 10 * 1024 * 1024,
            maxFileSizeLabel: "100 MB",
          },
          items: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          submission: {
            id: 3,
            status: "submitted",
            submittedAt: "2026-04-30T08:00:00Z",
            updatedAt: "2026-04-30T08:00:00Z",
          },
          items: [
            {
              id: 201,
              name: "answer.pdf",
              path: "/3/answer.pdf",
              kind: "file",
              size: 1024,
              downloadUrl: "/api/student/assignments/9/submission/files/201/download",
              previewUrl: "",
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const state = useStudentAssignmentDetail(computed(() => 9));
    await state.loadAssignment();
    await state.submitAssignment([new File(["answer"], "answer.pdf", { type: "application/pdf" })]);

    expect(state.assignment.value?.submission?.id).toBe(3);
    expect(state.items.value).toHaveLength(1);
    expect(state.items.value[0].name).toBe("answer.pdf");
  });
});

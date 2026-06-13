import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import { useStudentAssignments, getStudentAssignmentStatusText } from "@/composables/useStudentAssignments";
import { useStudentAssignmentDetail } from "@/composables/useStudentAssignmentDetail";

interface DeferredResponse {
  promise: Promise<Response>;
  resolve: (payload: unknown) => void;
}

function deferredResponse(): DeferredResponse {
  let resolvePromise: (response: Response) => void = () => {};
  const promise = new Promise<Response>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: (payload: unknown) => {
      resolvePromise({
        ok: true,
        status: 200,
        json: async () => payload,
      } as Response);
    },
  };
}

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
          {
            id: 11,
            classId: 1,
            title: "第三单元练习",
            description: "待补齐",
            dueAt: "2026-05-02T12:00:00Z",
            status: "published",
            createdAt: "2026-04-20T10:00:00Z",
            updatedAt: "2026-04-20T10:30:00Z",
            overdue: false,
            submission: {
              id: 3,
              status: "partial",
              submittedAt: "",
              updatedAt: "2026-04-21T08:00:00Z",
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const state = useStudentAssignments();
    await state.loadAssignments();

    expect(state.assignments.value).toHaveLength(3);
    expect(getStudentAssignmentStatusText(state.assignments.value[0])).toBe("未提交");
    expect(getStudentAssignmentStatusText(state.assignments.value[1])).toBe("已截止（已提交）");
    expect(getStudentAssignmentStatusText(state.assignments.value[2])).toBe("已保存待补齐");
  });

  it("loads detail and refreshes current submission after submit and delete", async () => {
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
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          submission: null,
          items: [],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const state = useStudentAssignmentDetail(computed(() => 9));
    await state.loadAssignment();
    await state.submitAssignment([new File(["answer"], "answer.pdf", { type: "application/pdf" })]);

    expect(state.assignment.value?.submission?.id).toBe(3);
    expect(state.items.value).toHaveLength(1);
    expect(state.items.value[0].name).toBe("answer.pdf");

    await state.deleteSubmissionFile(201);

    expect(state.assignment.value?.submission).toBeNull();
    expect(state.items.value).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/student/assignments/9/submission/files/201",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("keeps stale assignment list responses from replacing the latest page", async () => {
    const firstRequest = deferredResponse();
    const secondRequest = deferredResponse();
    vi.stubGlobal("fetch", vi.fn()
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise));

    const state = useStudentAssignments();
    const firstLoad = state.loadAssignments({ page: 1 });
    const secondLoad = state.loadAssignments({ page: 2 });

    secondRequest.resolve({
      assignments: [
        {
          id: 22,
          classId: 1,
          title: "第二页作业",
          description: "",
          dueAt: "",
          status: "published",
          createdAt: "",
          updatedAt: "",
          overdue: false,
          submission: null,
        },
      ],
      pagination: {
        page: 2,
        pageSize: 30,
        total: 31,
        totalPages: 2,
      },
    });
    await secondLoad;

    firstRequest.resolve({
      assignments: [
        {
          id: 11,
          classId: 1,
          title: "第一页旧作业",
          description: "",
          dueAt: "",
          status: "published",
          createdAt: "",
          updatedAt: "",
          overdue: false,
          submission: null,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 30,
        total: 31,
        totalPages: 2,
      },
    });
    await firstLoad;

    expect(state.assignments.value.map((assignment) => assignment.id)).toEqual([22]);
    expect(state.pagination.value.page).toBe(2);
    expect(state.loading.value).toBe(false);
  });

  it("keeps stale detail responses from replacing the current assignment", async () => {
    const firstRequest = deferredResponse();
    const secondRequest = deferredResponse();
    vi.stubGlobal("fetch", vi.fn()
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise));

    const currentAssignmentId = ref(9);
    const assignmentId = computed(() => currentAssignmentId.value);
    const state = useStudentAssignmentDetail(assignmentId);
    const firstLoad = state.loadAssignment();
    currentAssignmentId.value = 10;
    const secondLoad = state.loadAssignment();

    secondRequest.resolve({
      id: 10,
      classId: 1,
      title: "当前作业",
      description: "",
      dueAt: "",
      status: "published",
      createdAt: "",
      updatedAt: "",
      overdue: false,
      submission: null,
      submissionConstraints: {
        allowedTypesLabel: "",
        maxFileSizeBytes: 0,
        maxFileSizeLabel: "",
      },
      assignmentAttachments: [],
      items: [],
    });
    await secondLoad;

    firstRequest.resolve({
      id: 9,
      classId: 1,
      title: "旧作业",
      description: "",
      dueAt: "",
      status: "published",
      createdAt: "",
      updatedAt: "",
      overdue: false,
      submission: null,
      submissionConstraints: {
        allowedTypesLabel: "",
        maxFileSizeBytes: 0,
        maxFileSizeLabel: "",
      },
      assignmentAttachments: [],
      items: [],
    });
    await firstLoad;

    expect(state.assignment.value?.id).toBe(10);
    expect(state.assignment.value?.title).toBe("当前作业");
    expect(state.loading.value).toBe(false);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import StudentAssignmentDetailView from "@/views/StudentAssignmentDetailView.vue";

describe("StudentAssignmentDetailView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  it("places assignment details and teacher attachments before the submission action area", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 9,
        classId: 1,
        title: "第一单元练习",
        description: "完成练习册第 8 页",
        dueAt: "2026-05-01T12:00:00Z",
        status: "published",
        createdAt: "2026-04-23T10:00:00Z",
        updatedAt: "2026-04-23T10:30:00Z",
        overdue: false,
        submission: null,
        submissionConstraints: {
          allowedTypesLabel: "PDF、Word",
          maxFileSizeBytes: 1024,
          maxFileSizeLabel: "1 KB",
        },
        assignmentAttachments: [
          {
            id: 201,
            name: "老师讲义.pdf",
            path: "/9/老师讲义.pdf",
            kind: "file",
            size: 1024,
            downloadUrl: "/api/student/assignments/9/attachments/201/download",
            previewUrl: "",
          },
        ],
        items: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/student/assignments", component: { template: "<div>列表页</div>" } },
        { path: "/student/assignments/:assignmentId", component: StudentAssignmentDetailView },
      ],
    });
    await router.push("/student/assignments/9");
    await router.isReady();

    const wrapper = mount(StudentAssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    const overview = wrapper.get('[data-testid="student-assignment-overview"]');
    const submitPanel = wrapper.get('[data-testid="student-assignment-submit-panel"]');
    const currentSubmission = wrapper.get('[data-testid="student-assignment-current-submission"]');
    const attachmentList = overview.get('[data-testid="student-assignment-attachment-list"]');
    const attachmentBlock = overview.get('[data-testid="student-assignment-attachment-block"]');
    const requirement = overview.get('[data-testid="student-assignment-submission-requirement"]');

    expect(wrapper.find(".student-assignment-detail__header").exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-assignment-detail-workspace"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="student-assignment-detail-back"]').text()).toContain("返回");
    expect(wrapper.find('[data-testid="student-assignment-detail-refresh"]').exists()).toBe(true);
    const toolbar = wrapper.get(".student-assignment-detail__toolbar");
    expect(toolbar.text()).toContain("返回");
    expect(toolbar.text()).toContain("刷新");
    expect(toolbar.text()).not.toContain("作业详情");
    expect(toolbar.text()).not.toContain("第一单元练习");
    expect(wrapper.find(".student-assignment-detail__toolbar-title").exists()).toBe(false);
    expect(wrapper.find(".classes-page__eyebrow").exists()).toBe(false);
    expect(overview.text()).toContain("第一单元练习");
    expect(overview.text()).toContain("完成练习册第 8 页");
    expect(overview.find(".student-assignment-detail__hero").exists()).toBe(true);
    expect(overview.find(".student-assignment-detail__meta-band").exists()).toBe(true);
    expect(overview.find(".student-assignment-detail__support-strip").exists()).toBe(true);
    expect(submitPanel.text()).toContain("提交作业");
    expect(wrapper.get('[data-testid="student-submission-submit"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.get('[data-testid="student-submission-submit"]').text()).toContain("选择并提交");
    expect(wrapper.get('[data-testid="student-submission-picker-hint"]').text()).toContain("确认后才会提交");
    expect(wrapper.find('[data-testid="student-submission-submit-feedback"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-submission-input"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-submission-directory-input"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-submission-file-open"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-submission-directory-open"]').exists()).toBe(false);
    expect(requirement.text()).toContain("不限，至少 1 个文件");
    expect(requirement.text()).toContain("PDF、Word");
    expect(requirement.classes()).toContain("student-assignment-detail__requirement--responsive");
    expect(requirement.classes()).not.toContain("student-assignment-detail__requirement--nowrap");
    expect(requirement.find(".student-assignment-detail__requirement-item--format").exists()).toBe(true);
    expect(requirement.find(".student-assignment-detail__requirement-item--size").exists()).toBe(true);
    expect(requirement.find(".student-assignment-detail__requirement-item--due").exists()).toBe(true);
    expect(overview.element.compareDocumentPosition(submitPanel.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(submitPanel.element.compareDocumentPosition(currentSubmission.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(submitPanel.find('[data-testid="student-assignment-attachment-block"]').exists()).toBe(false);
    expect(attachmentBlock.element.compareDocumentPosition(requirement.element) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(wrapper.text()).toContain("作业附件");
    expect(wrapper.text()).toContain("老师讲义.pdf");
    expect(wrapper.find('[data-testid="student-assignment-attachment-panel"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("老师上传的作业资料可直接下载查看。");
    expect(wrapper.get('a[href="/api/student/assignments/9/attachments/201/download"]').text()).toBe("老师讲义.pdf");

    await wrapper.get('[data-testid="student-submission-submit"]').trigger("click");

    const dialog = wrapper.get('[data-testid="student-submission-dialog"]');
    expect(dialog.text()).toContain("提交作业");
    expect(dialog.get('[data-testid="student-submission-dialog-summary"]').text()).toContain("按左侧作业要求选择文件或文件夹");
    expect(dialog.text()).not.toContain("单个文件不超过");
    expect(dialog.find('[data-testid="student-submission-file-open"]').exists()).toBe(true);
    expect(dialog.find('[data-testid="student-submission-directory-open"]').exists()).toBe(true);
    expect(dialog.get('[data-testid="student-submission-file-open"]').attributes("for")).toBe("student-submission-file-input");
    expect(dialog.get('[data-testid="student-submission-directory-open"]').attributes("for")).toBe("student-submission-directory-input");
    expect(dialog.get('[data-testid="student-submission-dialog-submit"]').attributes("disabled")).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("adds files to the current submission and lets students delete files before deadline", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 9,
          classId: 1,
          title: "第一单元练习",
          description: "完成练习册第 8 页",
          dueAt: "2026-05-01T12:00:00Z",
          status: "published",
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
          overdue: false,
          submission: {
            id: 2,
            status: "submitted",
            submittedAt: "2026-04-29T08:00:00Z",
            updatedAt: "2026-04-29T08:00:00Z",
          },
          submissionConstraints: {
            allowedTypesLabel: "PDF、Word",
            maxFileSizeBytes: 1024,
            maxFileSizeLabel: "1 KB",
          },
          items: [
            {
              id: 101,
              name: "old.txt",
              path: "/2/old.txt",
              kind: "file",
              size: 12,
              downloadUrl: "/api/student/assignments/9/submission/files/101/download",
              previewUrl: "",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          submission: {
            id: 2,
            status: "submitted",
            submittedAt: "2026-04-29T08:00:00Z",
            updatedAt: "2026-04-30T08:00:00Z",
          },
          items: [
            {
              id: 101,
              name: "old.txt",
              path: "/2/old.txt",
              kind: "file",
              size: 12,
              downloadUrl: "/api/student/assignments/9/submission/files/101/download",
              previewUrl: "",
            },
            {
              id: 102,
              name: "new.txt",
              path: "/2/new.txt",
              kind: "file",
              size: 24,
              downloadUrl: "/api/student/assignments/9/submission/files/102/download",
              previewUrl: "",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          submission: {
            id: 2,
            status: "submitted",
            submittedAt: "2026-04-29T08:00:00Z",
            updatedAt: "2026-04-30T08:10:00Z",
          },
          items: [
            {
              id: 102,
              name: "new.txt",
              path: "/2/new.txt",
              kind: "file",
              size: 24,
              downloadUrl: "/api/student/assignments/9/submission/files/102/download",
              previewUrl: "",
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/student/assignments", component: { template: "<div>列表页</div>" } },
        { path: "/student/assignments/:assignmentId", component: StudentAssignmentDetailView },
      ],
    });
    await router.push("/student/assignments/9");
    await router.isReady();

    const wrapper = mount(StudentAssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="student-assignment-submit-panel"]').text()).toContain("添加到当前提交");
    expect(wrapper.get('[data-testid="student-submission-submit"]').text()).toContain("继续添加");
    expect(wrapper.get('[data-testid="student-assignment-current-submission"]').text()).toContain("当前提交");
    expect(wrapper.get('[data-testid="student-assignment-submission-grid"]').text()).toContain("old.txt");
    expect(wrapper.get('[data-testid="student-assignment-submission-download-101"]').attributes("href")).toBe(
      "/api/student/assignments/9/submission/files/101/download",
    );

    await wrapper.get('[data-testid="student-submission-submit"]').trigger("click");
    expect(wrapper.get('[data-testid="student-submission-dialog"]').text()).toContain("添加到当前提交");

    const input = wrapper.get('[data-testid="student-submission-input"]').element as HTMLInputElement;
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [
        new File(["draft"], "draft.txt", { type: "text/plain" }),
        new File(["new submission"], "new.txt", { type: "text/plain" }),
      ],
    });

    await wrapper.get('[data-testid="student-submission-input"]').trigger("change");
    expect(wrapper.get('[data-testid="student-submission-selection"]').text()).toContain("draft.txt");
    expect(wrapper.get('[data-testid="student-submission-selection"]').text()).toContain("new.txt");
    await wrapper.get('[data-testid="student-submission-selected-remove-0"]').trigger("click");
    expect(wrapper.get('[data-testid="student-submission-selection"]').text()).not.toContain("draft.txt");
    expect(wrapper.get('[data-testid="student-submission-selection"]').text()).toContain("new.txt");
    expect(wrapper.get('[data-testid="student-submission-dialog-submit"]').attributes("disabled")).toBeUndefined();

    await wrapper.get('[data-testid="student-submission-dialog-submit"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="student-submission-confirm-dialog"]').text()).toContain("确认添加这 1 个文件");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await wrapper.get('[data-testid="student-submission-confirm-cancel"]').trigger("click");
    expect(wrapper.find('[data-testid="student-submission-confirm-dialog"]').exists()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await wrapper.get('[data-testid="student-submission-dialog-submit"]').trigger("click");
    await wrapper.get('[data-testid="student-submission-confirm-confirm"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/student/assignments/9/submission",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }),
    );
    expect(wrapper.find('[data-testid="student-submission-dialog"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("new.txt");
    expect(wrapper.text()).toContain("old.txt");
    expect(wrapper.get('[data-testid="student-submission-submit-feedback"]').text()).toContain("已添加");

    await wrapper.get('[data-testid="student-assignment-submission-delete-101"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="student-assignment-submission-delete-confirm-dialog"]').text()).toContain("old.txt");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await wrapper.get('[data-testid="student-assignment-submission-delete-confirm-cancel"]').trigger("click");
    expect(wrapper.find('[data-testid="student-assignment-submission-delete-confirm-dialog"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("old.txt");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await wrapper.get('[data-testid="student-assignment-submission-delete-101"]').trigger("click");
    await wrapper.get('[data-testid="student-assignment-submission-delete-confirm-confirm"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/student/assignments/9/submission/files/101",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
    expect(wrapper.text()).toContain("new.txt");
    expect(wrapper.text()).not.toContain("old.txt");
    expect(wrapper.get('[data-testid="student-submission-submit-feedback"]').text()).toContain("已删除");
  });

  it("asks before closing the submission dialog with unsubmitted selected files", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 29,
        classId: 1,
        title: "草稿选择",
        description: "测试关闭确认",
        dueAt: "2026-05-03T12:00:00Z",
        status: "published",
        createdAt: "2026-04-23T10:00:00Z",
        updatedAt: "2026-04-23T10:30:00Z",
        overdue: false,
        submission: null,
        submissionConstraints: {
          allowedTypesLabel: "PDF、Word、Excel、PPT、TXT、JPG、PNG、ZIP",
          maxFileSizeBytes: 100 * 1024 * 1024,
          maxFileSizeLabel: "100 MB",
        },
        items: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/student/assignments", component: { template: "<div>列表页</div>" } },
        { path: "/student/assignments/:assignmentId", component: StudentAssignmentDetailView },
      ],
    });
    await router.push("/student/assignments/29");
    await router.isReady();

    const wrapper = mount(StudentAssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="student-submission-submit"]').trigger("click");

    const input = wrapper.get('[data-testid="student-submission-input"]').element as HTMLInputElement;
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [new File(["draft"], "draft.txt", { type: "text/plain" })],
    });
    await wrapper.get('[data-testid="student-submission-input"]').trigger("change");

    await wrapper.get('[data-testid="student-submission-dialog-close"]').trigger("click");
    expect(wrapper.get('[data-testid="student-submission-discard-dialog"]').text()).toContain("放弃本次选择");
    await wrapper.get('[data-testid="student-submission-discard-cancel"]').trigger("click");
    expect(wrapper.find('[data-testid="student-submission-dialog"]').exists()).toBe(true);

    await wrapper.get('[data-testid="student-submission-dialog-close"]').trigger("click");
    await wrapper.get('[data-testid="student-submission-discard-confirm"]').trigger("click");
    expect(wrapper.find('[data-testid="student-submission-dialog"]').exists()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows current submitted files as one thumbnail grid and opens images in a dialog", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 19,
        classId: 1,
        title: "石膏像",
        description: "",
        dueAt: "2026-05-10T12:00:00Z",
        status: "published",
        createdAt: "2026-05-01T10:00:00Z",
        updatedAt: "2026-05-01T10:30:00Z",
        overdue: false,
        submission: {
          id: 6,
          status: "submitted",
          submittedAt: "2026-05-06T07:52:32Z",
          updatedAt: "2026-05-06T07:52:32Z",
        },
        submissionConstraints: {
          allowedTypesLabel: "PDF、Word、Excel、PPT、TXT、JPG、PNG、ZIP",
          maxFileSizeBytes: 100 * 1024 * 1024,
          maxFileSizeLabel: "100 MB",
        },
        items: [
          {
            id: 401,
            name: "素材.JPG",
            path: "/6/素材.JPG",
            kind: "file",
            size: 900 * 1024,
            downloadUrl: "/api/student/assignments/19/submission/files/401/download",
            previewUrl: "/api/student/assignments/19/submission/files/401/preview",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/student/assignments", component: { template: "<div>列表页</div>" } },
        { path: "/student/assignments/:assignmentId", component: StudentAssignmentDetailView },
      ],
    });
    await router.push("/student/assignments/19");
    await router.isReady();

    const wrapper = mount(StudentAssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="student-current-submission-preview"]').exists()).toBe(false);
    const grid = wrapper.get('[data-testid="student-assignment-submission-grid"]');
    expect(grid.text()).toContain("素材.JPG");
    expect(grid.get('[data-testid="student-assignment-submission-thumb-401"]').attributes("src")).toBe(
      "/api/student/assignments/19/submission/files/401/preview",
    );
    expect(wrapper.find('[data-testid="file-preview-dialog"]').exists()).toBe(false);

    await wrapper.get('[data-testid="student-assignment-submission-preview-401"]').trigger("click");

    const dialog = wrapper.get('[data-testid="file-preview-dialog"]');
    expect(dialog.text()).toContain("素材.JPG");
    expect(dialog.get('[data-testid="file-preview-image"]').attributes("src")).toBe(
      "/api/student/assignments/19/submission/files/401/preview",
    );
  });

  it("shows readonly state after deadline", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 12,
        classId: 1,
        title: "已截止作业",
        description: "不能再提交",
        dueAt: "2026-04-20T12:00:00Z",
        status: "published",
        createdAt: "2026-04-19T10:00:00Z",
        updatedAt: "2026-04-20T10:00:00Z",
        overdue: true,
        submission: null,
        submissionConstraints: {
          allowedTypesLabel: "PDF、Word",
          maxFileSizeBytes: 1024,
          maxFileSizeLabel: "1 KB",
        },
        items: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/student/assignments", component: { template: "<div>列表页</div>" } },
        { path: "/student/assignments/:assignmentId", component: StudentAssignmentDetailView },
      ],
    });
    await router.push("/student/assignments/12");
    await router.isReady();

    const wrapper = mount(StudentAssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("已截止，不能再提交");
    expect(wrapper.find('[data-testid="student-submission-input"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-submission-submit"]').exists()).toBe(false);
  });

  it("shows submission constraints and backend validation error", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 13,
          classId: 1,
          title: "格式校验作业",
          description: "测试类型和大小限制",
          dueAt: "2026-05-03T12:00:00Z",
          status: "published",
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
          overdue: false,
          submission: null,
          submissionConstraints: {
            allowedTypesLabel: "PDF、Word、Excel、PPT、TXT、JPG、PNG、ZIP",
            maxFileSizeBytes: 100 * 1024 * 1024,
            maxFileSizeLabel: "100 MB",
          },
          items: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          error: {
            code: "invalid_request",
            message: "仅支持 PDF、Word、Excel、PPT、TXT、JPG、PNG、ZIP 文件",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/student/assignments", component: { template: "<div>列表页</div>" } },
        { path: "/student/assignments/:assignmentId", component: StudentAssignmentDetailView },
      ],
    });
    await router.push("/student/assignments/13");
    await router.isReady();

    const wrapper = mount(StudentAssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    await wrapper.get('[data-testid="student-submission-submit"]').trigger("click");
    expect(wrapper.get('[data-testid="student-submission-dialog"]').text()).toContain("提交作业");

    const input = wrapper.get('[data-testid="student-submission-input"]').element as HTMLInputElement;
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [new File(["bad"], "paper.pdf", { type: "application/pdf" })],
    });

    await wrapper.get('[data-testid="student-submission-input"]').trigger("change");
    await wrapper.get('[data-testid="student-submission-dialog-submit"]').trigger("click");
    await wrapper.get('[data-testid="student-submission-confirm-confirm"]').trigger("click");
    await flushPromises();

    const requirement = wrapper.get('[data-testid="student-assignment-submission-requirement"]');
    expect(requirement.text()).toContain("PDF、Word、Excel、PPT、TXT、JPG、PNG、ZIP");
    expect(requirement.text()).toContain("单个文件不超过 100 MB");
    expect(wrapper.text()).toContain("仅支持 PDF、Word、Excel、PPT、TXT、JPG、PNG、ZIP 文件");
  });

  it("keeps folder relative paths when students choose a directory", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 15,
          classId: 1,
          title: "图片作业",
          description: "提交文件夹",
          dueAt: "2026-05-03T12:00:00Z",
          status: "published",
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
          overdue: false,
          submission: null,
          submissionConstraints: {
            allowedTypesLabel: "JPG、PNG、ZIP",
            maxFileSizeBytes: 100 * 1024 * 1024,
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
            id: 5,
            status: "submitted",
            submittedAt: "2026-04-30T08:00:00Z",
            updatedAt: "2026-04-30T08:00:00Z",
          },
          items: [
            {
              id: 301,
              name: "20260001-张小明",
              path: "/5/20260001-张小明",
              kind: "dir",
              size: 0,
              fileCount: 2,
              folderCount: 1,
              downloadUrl: "/api/student/assignments/15/submission/files/301/download",
              archiveUrl: "/api/student/assignments/15/submission/files/301/download",
              previewUrl: "",
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/student/assignments", component: { template: "<div>列表页</div>" } },
        { path: "/student/assignments/:assignmentId", component: StudentAssignmentDetailView },
      ],
    });
    await router.push("/student/assignments/15");
    await router.isReady();

    const wrapper = mount(StudentAssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="student-submission-file-open"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-submission-directory-open"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="student-submission-submit"]').text()).toBe("选择并提交");
    await wrapper.get('[data-testid="student-submission-submit"]').trigger("click");
    expect(wrapper.get('[data-testid="student-submission-dialog"]').text()).toContain("提交作业");
    expect(wrapper.find('[data-testid="student-submission-file-open"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="student-submission-directory-open"]').exists()).toBe(true);

    const file = new File(["image"], "one.png", { type: "image/png" });
    Object.defineProperty(file, "webkitRelativePath", {
      configurable: true,
      value: "20260001-张小明/photos/one.png",
    });
    const input = wrapper.get('[data-testid="student-submission-directory-input"]').element as HTMLInputElement;
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [file],
    });

    await wrapper.get('[data-testid="student-submission-directory-input"]').trigger("change");
    expect(wrapper.get('[data-testid="student-submission-selection"]').text()).toContain("已选择文件夹：20260001-张小明（1 个文件）");
    await wrapper.get('[data-testid="student-submission-dialog-submit"]').trigger("click");
    expect(wrapper.get('[data-testid="student-submission-confirm-dialog"]').text()).toContain("确认提交这 1 个文件");
    await wrapper.get('[data-testid="student-submission-confirm-confirm"]').trigger("click");
    await flushPromises();

    const submitCall = fetchMock.mock.calls.find(([url]) => url === "/api/student/assignments/15/submission");
    expect(submitCall).toBeTruthy();
    const body = submitCall?.[1]?.body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("relativePaths")).toBe("20260001-张小明/photos/one.png");
    expect(wrapper.text()).toContain("文件夹 · 2 个文件，1 个子文件夹");
  });

  it("shows assignment submission rule and blocks plain files for folder-only assignments", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 16,
        classId: 1,
        title: "五张图片作业",
        description: "提交学号姓名文件夹",
        dueAt: "2026-05-03T12:00:00Z",
        status: "published",
        submissionMode: "folder",
        minFileCount: 5,
        createdAt: "2026-04-23T10:00:00Z",
        updatedAt: "2026-04-23T10:30:00Z",
        overdue: false,
        submission: null,
        submissionConstraints: {
          allowedTypesLabel: "JPG、PNG、ZIP",
          maxFileSizeBytes: 100 * 1024 * 1024,
          maxFileSizeLabel: "100 MB",
        },
        items: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/student/assignments", component: { template: "<div>列表页</div>" } },
        { path: "/student/assignments/:assignmentId", component: StudentAssignmentDetailView },
      ],
    });
    await router.push("/student/assignments/16");
    await router.isReady();

    const wrapper = mount(StudentAssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    const requirement = wrapper.get('[data-testid="student-assignment-submission-requirement"]');
    expect(requirement.text()).toContain("文件夹，至少 5 个文件");
    expect(requirement.text()).toContain("JPG、PNG、ZIP");
    expect(requirement.text()).toContain("100 MB");
    expect(wrapper.get('[data-testid="student-submission-picker-hint"]').text()).toContain("在弹窗中选择文件");
    expect(wrapper.find('[data-testid="student-submission-file-open"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-submission-input"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-submission-directory-open"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="student-submission-submit"]').text()).toBe("选择并提交");

    await wrapper.get('[data-testid="student-submission-submit"]').trigger("click");
    expect(wrapper.find('[data-testid="student-submission-file-open"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-submission-input"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="student-submission-directory-open"]').text()).toBe("选择文件夹");
    expect(wrapper.get('[data-testid="student-submission-directory-input"]').attributes("accept")).toContain(".png");
  });

  it("only offers file picking for file-only assignments", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 17,
        classId: 1,
        title: "文档作业",
        description: "只提交文件",
        dueAt: "2026-05-03T12:00:00Z",
        status: "published",
        submissionMode: "files",
        minFileCount: 1,
        createdAt: "2026-04-23T10:00:00Z",
        updatedAt: "2026-04-23T10:30:00Z",
        overdue: false,
        submission: null,
        submissionConstraints: {
          allowedTypesLabel: "Word 文档（DOC、DOCX）",
          maxFileSizeBytes: 100 * 1024 * 1024,
          maxFileSizeLabel: "100 MB",
        },
        items: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/student/assignments", component: { template: "<div>列表页</div>" } },
        { path: "/student/assignments/:assignmentId", component: StudentAssignmentDetailView },
      ],
    });
    await router.push("/student/assignments/17");
    await router.isReady();

    const wrapper = mount(StudentAssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="student-submission-picker-hint"]').text()).toContain("在弹窗中选择文件");
    expect(wrapper.get('[data-testid="student-submission-submit"]').text()).toBe("选择并提交");
    expect(wrapper.find('[data-testid="student-submission-file-open"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-submission-directory-open"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-submission-directory-input"]').exists()).toBe(false);

    await wrapper.get('[data-testid="student-submission-submit"]').trigger("click");
    expect(wrapper.get('[data-testid="student-submission-file-open"]').text()).toBe("选择文件");
    expect(wrapper.find('[data-testid="student-submission-directory-open"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-submission-directory-input"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="student-submission-input"]').attributes("accept")).toContain(".docx");
  });

  it("blocks unsupported file categories before uploading", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 18,
        classId: 1,
        title: "图片作业",
        description: "只提交图片",
        dueAt: "2026-05-03T12:00:00Z",
        status: "published",
        submissionMode: "files",
        submissionTypeCategory: "image",
        minFileCount: 1,
        createdAt: "2026-04-23T10:00:00Z",
        updatedAt: "2026-04-23T10:30:00Z",
        overdue: false,
        submission: null,
        submissionConstraints: {
          allowedTypesLabel: "图片文件（JPG、JPEG、PNG）",
          maxFileSizeBytes: 100 * 1024 * 1024,
          maxFileSizeLabel: "100 MB",
        },
        items: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/student/assignments", component: { template: "<div>列表页</div>" } },
        { path: "/student/assignments/:assignmentId", component: StudentAssignmentDetailView },
      ],
    });
    await router.push("/student/assignments/18");
    await router.isReady();

    const wrapper = mount(StudentAssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    await wrapper.get('[data-testid="student-submission-submit"]').trigger("click");
    const input = wrapper.get('[data-testid="student-submission-input"]').element as HTMLInputElement;
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [new File(["doc"], "report.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })],
    });

    await wrapper.get('[data-testid="student-submission-input"]').trigger("change");
    expect(wrapper.get('[data-testid="student-submission-input"]').attributes("accept")).toContain(".png");
    expect(wrapper.get('[data-testid="student-submission-dialog-submit"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-testid="student-submission-dialog"]').text()).toContain("仅支持图片文件（JPG、JPEG、PNG）");
    await wrapper.get('[data-testid="student-submission-dialog-submit"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("仅支持图片文件（JPG、JPEG、PNG）");
  });

  it("renders submission constraints from backend payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 14,
        classId: 1,
        title: "后端约束",
        description: "来自后端的提交约束",
        dueAt: "2026-05-03T12:00:00Z",
        status: "published",
        createdAt: "2026-04-23T10:00:00Z",
        updatedAt: "2026-04-23T10:30:00Z",
        overdue: false,
        submission: null,
        submissionConstraints: {
          allowedTypesLabel: "PDF、PNG",
          maxFileSizeBytes: 2048,
          maxFileSizeLabel: "2 KB",
        },
        items: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/student/assignments", component: { template: "<div>列表页</div>" } },
        { path: "/student/assignments/:assignmentId", component: StudentAssignmentDetailView },
      ],
    });
    await router.push("/student/assignments/14");
    await router.isReady();

    const wrapper = mount(StudentAssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    const requirement = wrapper.get('[data-testid="student-assignment-submission-requirement"]');
    expect(requirement.text()).toContain("PDF、PNG");
    expect(requirement.text()).toContain("单个文件不超过 2 KB");
  });
});

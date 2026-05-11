import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { ElDatePicker, ElDrawer } from "element-plus";
import AssignmentDetailView from "@/views/AssignmentDetailView.vue";

describe("AssignmentDetailView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads assignment detail and attachments from the deep link route", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 1, name: "一年级一班" },
            { id: 2, name: "一年级二班" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 9,
          classId: 2,
          title: "单元复习",
          description: "完成第 8 页题目",
          dueAt: "2026-05-01T12:00:00Z",
          status: "published",
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
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
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          submissions: [],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>作业管理页</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/9");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("单元复习");
    expect(wrapper.text()).toContain("一年级二班");
    expect(wrapper.text()).toContain("完成第 8 页题目");
    expect(wrapper.text()).toContain("已发布");
    expect(wrapper.get('[data-testid="assignment-detail-heading-meta"]').text()).not.toContain("至少");
    expect(wrapper.find('[data-testid="assignment-attachment-download-101"]').exists()).toBe(false);
    await wrapper.get('[data-testid="assignment-edit-open"]').trigger("click");
    await flushPromises();

    const detailDueAtPicker = wrapper.getComponent(ElDatePicker);
    expect(detailDueAtPicker.props("type")).toBe("datetime");
    expect(detailDueAtPicker.props("editable")).toBe(false);
    expect(wrapper.get('[data-testid="assignment-edit-due-at"]').attributes("type")).not.toBe("datetime-local");
    expect(wrapper.get('[data-testid="assignment-edit-attachment-manager"]').text()).toContain("习题答案.pdf");
    expect(wrapper.get('[data-testid="assignment-attachment-download-101"]').attributes("href")).toBe(
      "/api/assignments/9/attachments/101/download?classId=2",
    );
    await wrapper.get('[data-testid="assignment-edit-title"]').setValue("临时标题");
    await wrapper.get('[data-testid="assignment-edit-close"]').trigger("click");
    expect(wrapper.get('[data-testid="assignment-edit-discard-dialog"]').text()).toContain("作业修改还没有保存");
    await wrapper.get('[data-testid="assignment-edit-discard-cancel"]').trigger("click");
    expect(wrapper.get('[data-testid="assignment-edit-dialog"]').exists()).toBe(true);
    await wrapper.get('[data-testid="assignment-edit-backdrop"]').trigger("click");
    expect(wrapper.get('[data-testid="assignment-edit-discard-dialog"]').text()).toContain("作业修改还没有保存");
    await wrapper.get('[data-testid="assignment-edit-discard-confirm"]').trigger("click");
    expect(wrapper.find('[data-testid="assignment-edit-dialog"]').exists()).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith("/api/assignments/9?classId=2", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("/api/assignments/9/attachments?classId=2", expect.any(Object));
  });

  it("loads submission list from persisted query state", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [{ id: 2, name: "一年级二班" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 9,
          classId: 2,
          title: "单元复习",
          description: "完成第 8 页题目",
          dueAt: "2026-05-01T12:00:00Z",
          status: "published",
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          submissions: [
            {
              id: 13,
              studentId: 4,
              studentNo: "20260002",
              displayName: "李小红",
              status: "submitted",
              submittedAt: "2026-04-30T08:10:00Z",
              updatedAt: "2026-04-30T08:10:00Z",
              reviewStatus: "pending",
              teacherCommentSummary: "",
              reviewedAt: "",
              reviewerName: "",
              items: [
                {
                  id: 201,
                  name: "first.txt",
                  path: "/12/first.txt",
                  kind: "file",
                  size: 24,
                  downloadUrl: "/api/assignments/9/submissions/files/201/download?classId=2",
                  previewUrl: "/api/assignments/9/submissions/files/201/preview?classId=2",
                },
              ],
            },
            {
              id: 14,
              studentId: 5,
              studentNo: "20260003",
              displayName: "李待补齐",
              status: "partial",
              submittedAt: "",
              updatedAt: "2026-04-30T09:10:00Z",
              reviewStatus: "pending",
              teacherCommentSummary: "",
              reviewedAt: "",
              reviewerName: "",
              items: [
                {
                  id: 202,
                  name: "draft.txt",
                  path: "/14/draft.txt",
                  kind: "file",
                  size: 12,
                  downloadUrl: "/api/assignments/9/submissions/files/202/download?classId=2",
                  previewUrl: "/api/assignments/9/submissions/files/202/preview?classId=2",
                },
              ],
            },
          ],
          pagination: {
            page: 2,
            pageSize: 60,
            total: 121,
            totalPages: 3,
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>作业管理页</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/9?q=李&page=2&pageSize=60&sort=studentNo-asc");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    const submissionRequestUrl = String(fetchMock.mock.calls.find(([url]) => String(url).includes("/api/assignments/9/submissions"))?.[0] ?? "");
    expect(submissionRequestUrl).toContain("classId=2");
    expect(submissionRequestUrl).toContain("q=%E6%9D%8E");
    expect(submissionRequestUrl).toContain("page=2");
    expect(submissionRequestUrl).toContain("pageSize=60");
    expect(submissionRequestUrl).toContain("sort=studentNo-asc");
    expect(wrapper.get('[data-testid="assignment-submission-filter"]').element).toHaveProperty("value", "李");
    expect(wrapper.get('[data-testid="assignment-submission-pagination-summary"]').text()).toContain("第 2 / 3 页 · 共 121 条");
    expect(wrapper.get('[data-testid="assignment-submission-status-badge-14"]').text()).toContain("待补齐");
  });

  it("refreshes the current assignment submissions from the toolbar", async () => {
    let submissionRequestCount = 0;
    const fetchMock = vi.fn((url: RequestInfo | URL) => {
      const requestUrl = String(url);
      if (requestUrl === "/api/classes") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            classes: [{ id: 2, name: "一年级二班" }],
          }),
        });
      }
      if (requestUrl === "/api/assignments/9?classId=2") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            id: 9,
            classId: 2,
            title: "单元复习",
            description: "完成第 8 页题目",
            dueAt: "2026-05-01T12:00:00Z",
            status: "published",
            createdAt: "2026-04-23T10:00:00Z",
            updatedAt: "2026-04-23T10:30:00Z",
          }),
        });
      }
      if (requestUrl === "/api/assignments/9/attachments?classId=2") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            items: [],
          }),
        });
      }
      if (requestUrl === "/api/assignments/9/submissions?classId=2&sort=updatedAt-desc&page=1&pageSize=30") {
        submissionRequestCount += 1;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            submissions: [
              {
                id: 12,
                studentId: 4,
                studentNo: "20260002",
                displayName: submissionRequestCount === 1 ? "张小明" : "李小红",
                status: "submitted",
                submittedAt: "2026-04-30T08:10:00Z",
                updatedAt: "2026-04-30T08:10:00Z",
                reviewStatus: "pending",
                teacherCommentSummary: "",
                reviewedAt: "",
                reviewerName: "",
                items: [],
              },
            ],
            pagination: {
              page: 1,
              pageSize: 30,
              total: 1,
              totalPages: 1,
            },
          }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: `unexpected ${requestUrl}` } }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>作业管理页</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/9");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    expect(wrapper.text()).toContain("张小明");

    await wrapper.get('[data-testid="assignment-submission-refresh"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("李小红");
    expect(submissionRequestCount).toBe(2);
  });

  it("renders assignment detail overview above the submissions workspace", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 2, name: "一年级二班" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 9,
          classId: 2,
          title: "单元复习",
          description: "完成第 8 页题目",
          dueAt: "2026-05-01T12:00:00Z",
          status: "published",
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
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
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          submissions: [],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>作业管理页</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/9");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    const main = wrapper.get('[data-testid="assignment-detail-main"]');

    expect(wrapper.find('[data-testid="assignment-detail-overview"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="assignment-detail-status"]').text()).toContain("已发布");
    expect(wrapper.get('[data-testid="assignment-detail-description"]').text()).toContain("完成第 8 页题目");
    expect(wrapper.find('[data-testid="assignment-attachment-intro"]').exists()).toBe(false);
    expect(main.text()).toContain("学生当前提交");
    expect(main.text()).not.toContain("编辑作业");
    expect(wrapper.find('[data-testid="assignment-detail-side"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="assignment-edit-open"]').text()).toContain("修改作业");
  });

  it("renders current student submissions in the assignment detail page", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 2, name: "一年级二班" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 9,
          classId: 2,
          title: "单元复习",
          description: "完成第 8 页题目",
          dueAt: "2026-05-01T12:00:00Z",
          status: "published",
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
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
              items: [
                {
                  id: 201,
                  name: "new-one.txt",
                  path: "/12/new-one.txt",
                  kind: "file",
                  size: 24,
                  downloadUrl: "/api/assignments/9/submissions/files/201/download?classId=2",
                  previewUrl: "",
                },
              ],
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>作业管理页</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/9");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("学生当前提交");
    expect(wrapper.text()).toContain("张小明");
    expect(wrapper.text()).toContain("20260001");
    expect(wrapper.text()).toContain("new-one.txt");
    expect(fetchMock).toHaveBeenCalledWith("/api/assignments/9/submissions?classId=2&sort=updatedAt-desc&page=1&pageSize=30", expect.any(Object));
  });

  it("opens the review drawer from a submission row click and marks pending work reviewed", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [{ id: 2, name: "一年级二班" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 9,
          classId: 2,
          title: "单元复习",
          description: "完成第 8 页题目",
          dueAt: "2026-05-01T12:00:00Z",
          status: "published",
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
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
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 12,
          studentId: 3,
          studentNo: "20260001",
          displayName: "张小明",
          status: "submitted",
          submittedAt: "2026-04-30T08:00:00Z",
          updatedAt: "2026-04-30T08:30:00Z",
          reviewStatus: "reviewed",
          teacherCommentSummary: "",
          reviewedAt: "2026-04-30T09:30:00Z",
          reviewerName: "示例老师",
          items: [],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>作业管理页</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/9");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    await wrapper.get('[data-testid="assignment-submission-row-12"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="assignment-submission-review-drawer"]').text()).toContain("张小明");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments/9/submissions/12?classId=2",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          reviewStatus: "reviewed",
          teacherComment: "",
        }),
      }),
    );
    expect(wrapper.get('[data-testid="assignment-submission-row-12"]').text()).toContain("已批改");
  });

  it("renders submission controls and saves review summary for current page submissions", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [{ id: 2, name: "一年级二班" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 9,
          classId: 2,
          title: "单元复习",
          description: "完成第 8 页题目",
          dueAt: "2026-05-01T12:00:00Z",
          status: "published",
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          submissions: [
            {
              id: 12,
              studentId: 3,
              studentNo: "20260001",
              displayName: "张小明",
              status: "submitted",
              submittedAt: "2026-04-30T08:00:00Z",
              updatedAt: "2026-04-30T08:30:00Z",
              reviewStatus: "reviewed",
              teacherCommentSummary: "",
              reviewedAt: "2026-04-30T09:00:00Z",
              reviewerName: "示例老师",
              items: [
                {
                  id: 201,
                  name: "20260001-张小明",
                  path: "/12/20260001-张小明",
                  kind: "dir",
                  size: 0,
                  downloadUrl: "/api/assignments/9/submissions/files/201/download?classId=2",
                  archiveUrl: "/api/assignments/9/submissions/files/201/download?classId=2",
                  previewUrl: "",
                  fileCount: 2,
                  folderCount: 1,
                  children: [
                    {
                      id: 202,
                      name: "photos",
                      path: "/12/20260001-张小明/photos",
                      kind: "dir",
                      size: 0,
                      downloadUrl: "/api/assignments/9/submissions/files/202/download?classId=2",
                      archiveUrl: "/api/assignments/9/submissions/files/202/download?classId=2",
                      previewUrl: "",
                      fileCount: 1,
                      folderCount: 0,
                      children: [
                        {
                          id: 203,
                          name: "one.txt",
                          path: "/12/20260001-张小明/photos/one.txt",
                          kind: "file",
                          size: 24,
                          downloadUrl: "/api/assignments/9/submissions/files/203/download?classId=2",
                          previewUrl: "/api/assignments/9/submissions/files/203/preview?classId=2",
                        },
                      ],
                    },
                    {
                      id: 204,
                      name: "two.txt",
                      path: "/12/20260001-张小明/two.txt",
                      kind: "file",
                      size: 24,
                      downloadUrl: "/api/assignments/9/submissions/files/204/download?classId=2",
                      previewUrl: "/api/assignments/9/submissions/files/204/preview?classId=2",
                    },
                    {
                      id: 205,
                      name: "49梁桂瑛.pdf",
                      path: "/12/20260001-张小明/49梁桂瑛.pdf",
                      kind: "file",
                      size: 1433600,
                      downloadUrl: "/api/assignments/9/submissions/files/205/download?classId=2",
                      previewUrl: "",
                    },
                  ],
                },
              ],
            },
            {
              id: 13,
              studentId: 4,
              studentNo: "20260002",
              displayName: "李小红",
              status: "submitted",
              submittedAt: "2026-04-30T08:10:00Z",
              updatedAt: "2026-04-30T08:10:00Z",
              reviewStatus: "reviewed",
              teacherCommentSummary: "继续保持",
              reviewedAt: "2026-04-30T09:00:00Z",
              reviewerName: "示例老师",
              items: [],
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => "学生提交正文",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => "第二个文件正文",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
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
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 13,
          studentId: 4,
          studentNo: "20260002",
          displayName: "李小红",
          status: "submitted",
          submittedAt: "2026-04-30T08:10:00Z",
          updatedAt: "2026-04-30T08:10:00Z",
          reviewStatus: "reviewed",
          teacherCommentSummary: "继续保持",
          reviewedAt: "2026-04-30T09:00:00Z",
          reviewerName: "示例老师",
          items: [],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>作业管理页</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/9");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="assignment-submission-toolbar"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-submission-navigation"]').text()).toContain("下一条");
    expect(wrapper.get('[data-testid="assignment-submission-bulk-actions"]').text()).not.toContain("保存本页");
    expect(wrapper.find('[data-testid="assignment-submission-review-save-all"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="assignment-detail-missing-open"]').text()).toContain("未交统计");
    expect(wrapper.get('[data-testid="assignment-submission-download-archive"]').element.tagName).toBe("BUTTON");
    await wrapper.get('[data-testid="assignment-submission-download-archive"]').trigger("click");
    expect(wrapper.get('[data-testid="assignment-submission-download-confirm-dialog"]').text()).toContain("下载当前作业全部学生提交");
    expect(wrapper.get('[data-testid="assignment-submission-download-confirm-dialog"]').text()).toContain("提交清单");
    await wrapper.get('[data-testid="assignment-submission-download-confirm-cancel"]').trigger("click");
    expect(wrapper.get('[data-testid="assignment-submission-search"]').text()).toContain("搜索");
    expect(wrapper.get('[data-testid="assignment-submission-count"]').classes()).toContain("status-pill");
    expect(wrapper.get('[data-testid="assignment-submission-search"]').classes()).toContain("button");
    expect(wrapper.get('[data-testid="assignment-submission-search"]').classes()).not.toContain("el-button");
    expect(wrapper.get('[data-testid="assignment-submission-prev"]').classes()).toContain("button");
    expect(wrapper.get('[data-testid="assignment-submission-next"]').classes()).toContain("button");
    expect(wrapper.get('[data-testid="assignment-submission-review-mark-all"]').classes()).toContain("button--success");
    expect(wrapper.get('[data-testid="assignment-submissions-table"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-submission-open-12"]').text()).toContain("查看");
    expect(wrapper.get('[data-testid="assignment-submission-open-12"]').classes()).toContain("button");
    expect(wrapper.get('[data-testid="assignment-submission-open-12"]').classes()).not.toContain("el-button");
    expect(wrapper.get('[data-testid="assignment-submission-review-badge-12"]').classes()).toContain("status-pill");
    expect(wrapper.get('[data-testid="assignment-submission-review-badge-12"]').classes()).not.toContain("el-tag");
    expect(wrapper.get('[data-testid="assignment-submission-review-mark-all"]').text()).toContain("一键批改");
    const submissionContent = wrapper.get('[data-testid="assignment-submission-content-12"]');
    expect(submissionContent.text()).toContain("2 个文件");
    expect(submissionContent.get('[data-testid="assignment-submission-content-meta-12"]').text()).toContain("已提交");
    expect(submissionContent.get('[data-testid="assignment-submission-content-meta-12"]').text()).toContain("20260001-张小明");
    expect(submissionContent.html().indexOf('data-testid="assignment-submission-status-badge-12"')).toBeLessThan(
      submissionContent.html().indexOf('data-testid="assignment-submission-item-names-12"'),
    );

    const rows = wrapper.findAll('[data-testid^="assignment-submission-row-"]');
    expect(rows[0].text()).toContain("张小明");
    await wrapper.get('[data-testid="assignment-submission-next"]').trigger("click");
    expect(wrapper.get('[data-testid="assignment-submission-row-13"]').classes()).toContain("is-active");
    await wrapper.get('[data-testid="assignment-submission-prev"]').trigger("click");
    expect(wrapper.get('[data-testid="assignment-submission-row-12"]').classes()).toContain("is-active");

    await wrapper.get('[data-testid="assignment-submission-open-12"]').trigger("click");
    expect(wrapper.get('[data-testid="assignment-submission-review-drawer"]').text()).toContain("张小明");
    expect(wrapper.get('[data-testid="assignment-review-drawer-summary"]').text()).toContain("张小明");
    expect(wrapper.get('[data-testid="assignment-submission-review-drawer"]').find(".classes-page__eyebrow").exists()).toBe(false);
    expect(wrapper.get('[data-testid="assignment-review-drawer-summary"]').classes()).toContain("assignment-review-drawer__summary--readable");
    expect(wrapper.find(".assignment-review-drawer__meta").exists()).toBe(false);
    expect(wrapper.get('[data-testid="assignment-review-drawer-main"]').exists()).toBe(true);
    const drawerMainHtml = wrapper.get('[data-testid="assignment-review-drawer-main"]').html();
    expect(drawerMainHtml.indexOf("assignment-review-drawer__form")).toBeLessThan(
      drawerMainHtml.indexOf("assignment-review-drawer__files-panel"),
    );
    expect(wrapper.get(".assignment-review-drawer__review-row").exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-review-drawer-prev"]').text()).toContain("上一个学生");
    expect(wrapper.get('[data-testid="assignment-review-drawer-prev"]').classes()).toContain("assignment-review-drawer__nav-button");
    expect(wrapper.get('[data-testid="assignment-review-drawer-next"]').text()).toContain("下一个学生");
    expect(wrapper.get('[data-testid="assignment-review-drawer-next"]').classes()).toContain("assignment-review-drawer__nav-button");
    expect(wrapper.getComponent(ElDrawer).props("closeOnClickModal")).toBe(true);
    expect(typeof wrapper.getComponent(ElDrawer).props("beforeClose")).toBe("function");
    expect(wrapper.get('[data-testid="assignment-submission-review-status-field-12"]').classes()).toContain("assignment-review-drawer__status-field");
    expect(wrapper.find('[data-testid="assignment-review-drawer-inline-preview"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="assignment-submission-file-tree"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="assignment-submission-files-view-list"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-submission-files-view-grid"]').classes()).toContain("button--primary");
    expect(wrapper.get('[data-testid="assignment-submission-files-grid-size-controls"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-submission-files-grid-size-xlarge"]').text()).toContain("超大");
    expect(wrapper.get('[data-testid="assignment-submission-files-grid-size-xlarge"]').classes()).toContain("button--primary");
    expect(wrapper.get('[data-testid="assignment-submission-file-grid"]').classes()).toContain("submission-file-grid--xlarge");
    expect(wrapper.get('[data-testid="assignment-submission-file-grid"]').text()).toContain("20260001-张小明");
    expect(wrapper.get('[data-testid="assignment-submission-file-grid"]').text()).toContain("photos");
    await wrapper.get('[data-testid="assignment-submission-review-comment-12"]').setValue("临时评语");
    await wrapper.get('[data-testid="assignment-submission-review-close"]').trigger("click");
    expect(wrapper.get('[data-testid="assignment-review-close-discard-dialog"]').text()).toContain("批改内容还没有保存");
    await wrapper.get('[data-testid="assignment-review-close-discard-cancel"]').trigger("click");
    expect(wrapper.get('[data-testid="assignment-submission-review-drawer"]').text()).toContain("张小明");
    await wrapper.get('[data-testid="assignment-submission-files-view-list"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="assignment-submission-file-list"]').text()).toContain("one.txt");
    await wrapper.get('[data-testid="assignment-submission-files-view-grid"]').trigger("click");
    await wrapper.get('[data-testid="assignment-submission-files-grid-size-large"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="assignment-submission-file-grid"]').classes()).toContain("submission-file-grid--large");
    expect(wrapper.get('[data-testid="assignment-submission-file-203"]').text()).toContain("one.txt");
    expect(wrapper.get('[data-testid="assignment-submission-file-204"]').text()).toContain("two.txt");
    expect(wrapper.get('[data-testid="assignment-submission-file-205"]').text()).toContain("49梁桂瑛.pdf");
    expect(wrapper.get('[data-testid="assignment-submission-file-preview-205"]').text()).toContain("PDF");
    await wrapper.get('[data-testid="assignment-submission-file-preview-205"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="file-preview-pdf"]').attributes("src")).toBe(
      "/api/assignments/9/submissions/files/205/download?classId=2",
    );
    await wrapper.get('[data-testid="file-preview-close"]').trigger("click");
    await wrapper.get('[data-testid="assignment-submission-file-preview-203"]').trigger("click");
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments/9/submissions/files/203/preview?classId=2",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(wrapper.get('[data-testid="file-preview-previous"]').text()).toContain("上一个文件");
    expect(wrapper.get('[data-testid="file-preview-previous"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-testid="file-preview-next"]').text()).toContain("下一个文件");
    expect(wrapper.get('[data-testid="file-preview-next"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.get('[data-testid="file-preview-text"]').text()).toContain("学生提交正文");
    await wrapper.get('[data-testid="file-preview-next"]').trigger("click");
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments/9/submissions/files/204/preview?classId=2",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(wrapper.get('[data-testid="file-preview-text"]').text()).toContain("第二个文件正文");
    await wrapper.get('[data-testid="file-preview-close"]').trigger("click");
    await wrapper.get('[data-testid="assignment-submission-review-status-12"]').setValue("reviewed");
    await wrapper.get('[data-testid="assignment-submission-review-comment-12"]').setValue("书写清晰");
    await wrapper.get('[data-testid="assignment-submission-review-save-12"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments/9/submissions/12?classId=2",
      expect.objectContaining({
        method: "PATCH",
      }),
    );
    expect(wrapper.get('[data-testid="assignment-submission-row-12"]').text()).toContain("书写清晰");
    expect(wrapper.get('[data-testid="assignment-submission-row-12"]').text()).toContain("已批改");
    expect(wrapper.get('[data-testid="assignment-submission-row-12"]').text()).toContain("示例老师");
  });

  it("navigates the review drawer across paginated submissions with the current filters", async () => {
    const makeSubmission = (id: number, studentNo: string, displayName: string) => ({
      id,
      studentId: id + 100,
      studentNo,
      displayName,
      status: "submitted",
      submittedAt: "2026-04-30T08:00:00Z",
      updatedAt: "2026-04-30T08:30:00Z",
      reviewStatus: "reviewed",
      teacherCommentSummary: "",
      reviewedAt: "2026-04-30T09:30:00Z",
      reviewerName: "示例老师",
      items: [],
    });
    const firstPageSubmissions = [
      makeSubmission(12, "20260001", "张小明"),
      makeSubmission(13, "20260002", "李小红"),
    ];
    const secondPageSubmissions = [
      makeSubmission(14, "20260003", "王小蓝"),
    ];
    const fetchMock = vi.fn((url: RequestInfo | URL) => {
      const requestUrl = String(url);
      if (requestUrl === "/api/classes") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            classes: [{ id: 2, name: "一年级二班" }],
          }),
        });
      }
      if (requestUrl === "/api/assignments/9?classId=2") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            id: 9,
            classId: 2,
            title: "单元复习",
            description: "完成第 8 页题目",
            dueAt: "2026-05-01T12:00:00Z",
            status: "published",
            createdAt: "2026-04-23T10:00:00Z",
            updatedAt: "2026-04-23T10:30:00Z",
          }),
        });
      }
      if (requestUrl === "/api/assignments/9/attachments?classId=2") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            items: [],
          }),
        });
      }
      if (requestUrl === "/api/assignments/9/submissions?classId=2&q=%E5%88%86%E9%A1%B5&sort=studentNo-asc&page=1&pageSize=60") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            submissions: firstPageSubmissions,
            pagination: {
              page: 1,
              pageSize: 60,
              total: 3,
              totalPages: 2,
            },
          }),
        });
      }
      if (requestUrl === "/api/assignments/9/submissions?classId=2&q=%E5%88%86%E9%A1%B5&sort=studentNo-asc&page=2&pageSize=60") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            submissions: secondPageSubmissions,
            pagination: {
              page: 2,
              pageSize: 60,
              total: 3,
              totalPages: 2,
            },
          }),
        });
      }
      throw new Error(`unexpected request: ${requestUrl}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>作业管理页</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/9?q=分页&sort=studentNo-asc&page=1&pageSize=60");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    await wrapper.get('[data-testid="assignment-submission-open-13"]').trigger("click");
    expect(wrapper.get('[data-testid="assignment-submission-review-drawer"]').text()).toContain("李小红");
    expect(wrapper.get('[data-testid="assignment-review-drawer-next"]').attributes("disabled")).toBeUndefined();

    await wrapper.get('[data-testid="assignment-review-drawer-next"]').trigger("click");
    await flushPromises();
    await flushPromises();

    expect(router.currentRoute.value.query.page).toBe("2");
    expect(wrapper.get('[data-testid="assignment-submission-review-drawer"]').text()).toContain("王小蓝");
    expect(wrapper.get('[data-testid="assignment-review-drawer-next"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-testid="assignment-review-drawer-prev"]').attributes("disabled")).toBeUndefined();

    await wrapper.get('[data-testid="assignment-review-drawer-prev"]').trigger("click");
    await flushPromises();
    await flushPromises();

    expect(wrapper.get('[data-testid="assignment-submission-review-drawer"]').text()).toContain("李小红");
    expect(wrapper.get('[data-testid="assignment-review-drawer-next"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.get('[data-testid="assignment-review-drawer-prev"]').attributes("disabled")).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments/9/submissions?classId=2&q=%E5%88%86%E9%A1%B5&sort=studentNo-asc&page=2&pageSize=60",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments/9/submissions?classId=2&q=%E5%88%86%E9%A1%B5&sort=studentNo-asc&page=1&pageSize=60",
      expect.any(Object),
    );

    await wrapper.get('[data-testid="assignment-review-drawer-prev"]').trigger("click");
    expect(wrapper.get('[data-testid="assignment-submission-review-drawer"]').text()).toContain("张小明");
    expect(wrapper.get('[data-testid="assignment-review-drawer-prev"]').attributes("disabled")).toBeDefined();
  });

  it("keeps the review drawer mounted while cross-page drawer navigation loads", async () => {
    const makeSubmission = (id: number, studentNo: string, displayName: string) => ({
      id,
      studentId: id + 100,
      studentNo,
      displayName,
      status: "submitted",
      submittedAt: "2026-04-30T08:00:00Z",
      updatedAt: "2026-04-30T08:30:00Z",
      reviewStatus: "reviewed",
      teacherCommentSummary: "",
      reviewedAt: "2026-04-30T09:30:00Z",
      reviewerName: "示例老师",
      items: [],
    });
    const firstPageSubmissions = [
      makeSubmission(12, "20260001", "张小明"),
      makeSubmission(13, "20260002", "李小红"),
    ];
    const secondPageSubmissions = [
      makeSubmission(14, "20260003", "王小蓝"),
    ];
    type FetchResponse = {
      ok: true;
      status: number;
      json: () => Promise<unknown>;
    };
    let resolvePage2Submissions: (value: FetchResponse) => void = () => undefined;
    const page2Submissions = new Promise<FetchResponse>((resolve) => {
      resolvePage2Submissions = resolve;
    });
    const fetchMock = vi.fn((url: RequestInfo | URL) => {
      const requestUrl = String(url);
      if (requestUrl === "/api/classes") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            classes: [{ id: 2, name: "一年级二班" }],
          }),
        });
      }
      if (requestUrl === "/api/assignments/9?classId=2") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            id: 9,
            classId: 2,
            title: "单元复习",
            description: "完成第 8 页题目",
            dueAt: "2026-05-01T12:00:00Z",
            status: "published",
            createdAt: "2026-04-23T10:00:00Z",
            updatedAt: "2026-04-23T10:30:00Z",
          }),
        });
      }
      if (requestUrl === "/api/assignments/9/attachments?classId=2") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            items: [],
          }),
        });
      }
      if (requestUrl === "/api/assignments/9/submissions?classId=2&sort=updatedAt-desc&page=1&pageSize=60") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            submissions: firstPageSubmissions,
            pagination: {
              page: 1,
              pageSize: 60,
              total: 3,
              totalPages: 2,
            },
          }),
        });
      }
      if (requestUrl === "/api/assignments/9/submissions?classId=2&sort=updatedAt-desc&page=2&pageSize=60") {
        return page2Submissions;
      }
      throw new Error(`unexpected request: ${requestUrl}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>作业管理页</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/9?pageSize=60");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="assignment-submission-open-13"]').trigger("click");
    await wrapper.get('[data-testid="assignment-review-drawer-next"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="assignment-submission-review-drawer"]').text()).toContain("李小红");
    expect(wrapper.find(".classes-page__detail-layout").exists()).toBe(true);

    resolvePage2Submissions({
      ok: true,
      status: 200,
      json: async () => ({
        submissions: secondPageSubmissions,
        pagination: {
          page: 2,
          pageSize: 60,
          total: 3,
          totalPages: 2,
        },
      }),
    });
    await flushPromises();
    await flushPromises();

    expect(wrapper.get('[data-testid="assignment-submission-review-drawer"]').text()).toContain("王小蓝");
  });

  it("uses the backend statistics snapshot for assignment-detail missing statistics", async () => {
    const createObjectURL = vi.fn(() => "blob:detail-missing-stats");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });
    const linkClicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function clickDownloadLink() {
      linkClicks.push(this.download);
    });
    const students = Array.from({ length: 49 }, (_, index) => {
      const id = index + 1;
      return {
        id,
        classId: 2,
        studentNo: String(20260000 + id),
        displayName: `学生${id}`,
      };
    });
    const submissions = students.slice(0, 22).map((student) => ({
      id: student.id + 100,
      studentId: student.id,
      studentNo: student.studentNo,
      displayName: student.displayName,
      status: "submitted",
      submittedAt: "2026-04-30T08:00:00Z",
      updatedAt: "2026-04-30T08:30:00Z",
      reviewStatus: "pending",
      teacherCommentSummary: "",
      reviewedAt: "",
      reviewerName: "",
      items: [],
    }));
    const fetchMock = vi.fn((url: RequestInfo | URL) => {
      const requestUrl = String(url);
      if (requestUrl === "/api/classes") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            classes: [{ id: 2, name: "一年级二班" }],
          }),
        });
      }
      if (requestUrl === "/api/assignments/9?classId=2") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            id: 9,
            classId: 2,
            title: "单元复习",
            description: "Description",
            dueAt: "2026-05-01T12:00:00Z",
            status: "published",
            createdAt: "2026-04-23T10:00:00Z",
            updatedAt: "2026-04-23T10:30:00Z",
          }),
        });
      }
      if (requestUrl === "/api/assignments/9/attachments?classId=2") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            items: [],
          }),
        });
      }
      if (requestUrl === "/api/assignments/9/submissions?classId=2&sort=updatedAt-desc&page=1&pageSize=30") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            submissions: submissions.slice(0, 22),
            pagination: {
              page: 1,
              pageSize: 30,
              total: 22,
              totalPages: 1,
            },
          }),
        });
      }
      if (requestUrl === "/api/assignments/statistics?classId=2&assignmentIds=9") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            classId: 2,
            assignmentIds: [9],
            rosterTotal: 49,
            assignmentTotal: 1,
            expectedTotal: 49,
            submittedTotal: 22,
            missingTotal: 27,
            rows: students.map((student, index) => ({
              studentId: student.id,
              studentNo: student.studentNo,
              displayName: student.displayName,
              submittedCount: index < 22 ? 1 : 0,
              missingCount: index < 22 ? 0 : 1,
            })),
          }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: `unexpected ${requestUrl}` } }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>Class assignments</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/9");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    expect(wrapper.get('[data-testid="assignment-detail-missing-open"]').classes()).toContain("button--accent");
    const submissionWorkspaceHtml = wrapper.get(".assignment-submissions-workspace").html();
    expect(submissionWorkspaceHtml.indexOf('data-testid="assignment-submission-pagination-summary"')).toBeLessThan(
      submissionWorkspaceHtml.indexOf('data-testid="assignment-submissions-table"'),
    );

    await wrapper.get('[data-testid="assignment-detail-missing-open"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="assignment-detail-missing-dialog"]').text()).toContain("单元复习 · 未交名单");
    expect(wrapper.get('[data-testid="assignment-detail-missing-count"]').text()).toContain("共 27 名未交学生 · 全班 49 人 · 已交 22 人");
    expect(wrapper.get('[data-testid="assignment-detail-missing-table"]').text()).toContain("学生23");
    expect(wrapper.get('[data-testid="assignment-detail-missing-table"]').text()).toContain("学生49");
    expect(wrapper.get('[data-testid="assignment-detail-missing-table"]').text()).not.toContain("学生1");
    expect(wrapper.get('[data-testid="assignment-detail-missing-pagination-summary"]').text()).toContain("共 27 条");
    const missingDialogHtml = wrapper.get('[data-testid="assignment-detail-missing-dialog"]').html();
    expect(missingDialogHtml.indexOf('data-testid="assignment-detail-missing-pagination-summary"')).toBeLessThan(
      missingDialogHtml.indexOf('data-testid="assignment-detail-missing-table"'),
    );
    await wrapper.get('[data-testid="assignment-detail-missing-export"]').trigger("click");
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:detail-missing-stats");
    expect(linkClicks).toContain("单元复习-未交统计.xls");
    expect(fetchMock).toHaveBeenCalledWith("/api/assignments/statistics?classId=2&assignmentIds=9", expect.any(Object));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/students?classId=2&page=1&pageSize=100", expect.any(Object));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/assignments/9/submissions?classId=2&page=1&pageSize=100", expect.any(Object));
  });

  it("marks all submissions for the current assignment as reviewed", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [{ id: 2, name: "一年级二班" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 9,
          classId: 2,
          title: "单元复习",
          description: "Description",
          dueAt: "2026-05-01T12:00:00Z",
          status: "published",
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
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
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
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
            {
              id: 13,
              studentId: 4,
              studentNo: "20260002",
              displayName: "李小红",
              status: "submitted",
              submittedAt: "2026-04-30T08:10:00Z",
              updatedAt: "2026-04-30T08:10:00Z",
              reviewStatus: "pending",
              teacherCommentSummary: "保留原评语",
              reviewedAt: "",
              reviewerName: "",
              items: [],
            },
          ],
          pagination: {
            page: 1,
            pageSize: 100,
            total: 2,
            totalPages: 1,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 12,
          studentId: 3,
          studentNo: "20260001",
          displayName: "张小明",
          status: "submitted",
          submittedAt: "2026-04-30T08:00:00Z",
          updatedAt: "2026-04-30T08:30:00Z",
          reviewStatus: "reviewed",
          teacherCommentSummary: "",
          reviewedAt: "2026-04-30T09:30:00Z",
          reviewerName: "示例老师",
          items: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 13,
          studentId: 4,
          studentNo: "20260002",
          displayName: "李小红",
          status: "submitted",
          submittedAt: "2026-04-30T08:10:00Z",
          updatedAt: "2026-04-30T08:10:00Z",
          reviewStatus: "reviewed",
          teacherCommentSummary: "保留原评语",
          reviewedAt: "2026-04-30T09:40:00Z",
          reviewerName: "示例老师",
          items: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          submissions: [
            {
              id: 12,
              studentId: 3,
              studentNo: "20260001",
              displayName: "张小明",
              status: "submitted",
              submittedAt: "2026-04-30T08:00:00Z",
              updatedAt: "2026-04-30T08:30:00Z",
              reviewStatus: "reviewed",
              teacherCommentSummary: "",
              reviewedAt: "2026-04-30T09:30:00Z",
              reviewerName: "示例老师",
              items: [],
            },
          ],
          pagination: {
            page: 1,
            pageSize: 8,
            total: 2,
            totalPages: 1,
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>作业管理页</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/9");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="assignment-submission-review-mark-all"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments/9/submissions?classId=2&sort=updatedAt-desc&page=1&pageSize=100",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments/9/submissions/12?classId=2",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments/9/submissions/13?classId=2",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("保留原评语"),
      }),
    );
    expect(wrapper.get('[data-testid="assignment-submission-row-12"]').text()).toContain("已批改");
  });

  it("renders not found state when assignment detail is missing", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 2, name: "一年级二班" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: "not_found",
            message: "作业不存在",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>作业管理页</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/99");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("未找到该作业");
    expect(wrapper.text()).toContain("返回作业管理");
  });

  it("shows empty attachment state when the current assignment has no attachments", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 2, name: "一年级二班" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 9,
          classId: 2,
          title: "单元复习",
          description: "",
          dueAt: "",
          status: "draft",
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          submissions: [],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>作业管理页</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/9");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="assignment-attachment-manager"]').exists()).toBe(false);
    await wrapper.get('[data-testid="assignment-edit-open"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="assignment-attachment-manager"]').text()).toContain("当前作业还没有附件");
    expect(wrapper.get('[data-testid="assignment-attachment-upload"]').text()).toContain("添加附件");
  });

  it("saves assignment updates from the detail page", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 2, name: "一年级二班" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 9,
          classId: 2,
          title: "单元复习",
          description: "完成第 8 页题目",
          dueAt: "2026-05-01T12:00:00Z",
          status: "draft",
          submissionMode: "folder",
          minFileCount: 5,
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          submissions: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 9,
          classId: 2,
          title: "单元复习-修订版",
          description: "新的作业说明",
          dueAt: "2026-05-03T12:00:00Z",
          status: "published",
          submissionMode: "folder",
          minFileCount: 5,
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T11:00:00Z",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>作业管理页</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/9");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    expect(wrapper.find('[data-testid="assignment-edit-form"]').exists()).toBe(false);
    await wrapper.get('[data-testid="assignment-edit-open"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="assignment-edit-dialog"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-edit-form"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-edit-description-field"]').text()).toContain("作业说明");
    expect(wrapper.get('[data-testid="assignment-edit-due-at-field"]').text()).toContain("截止时间");
    expect(wrapper.get('[data-testid="assignment-edit-status-help"]').text()).toContain("未发布仅老师可见");
    expect(wrapper.get('[data-testid="assignment-edit-intro"]').text()).toContain("基本信息");
    expect(wrapper.get('[data-testid="assignment-edit-intro"]').text()).not.toContain("修改标题、说明、截止时间和发布状态");
    const editDueAtPicker = wrapper.getComponent(ElDatePicker);
    expect(editDueAtPicker.props("type")).toBe("datetime");
    expect(editDueAtPicker.props("editable")).toBe(false);
    expect(wrapper.get('[data-testid="assignment-edit-due-at"]').classes()).toContain("app-datetime-input");
    expect(wrapper.get('[data-testid="assignment-edit-attachment-manager"]').text()).toContain("附件管理");
    expect(wrapper.get('[data-testid="assignment-edit-attachment-manager"]').text()).toContain("添加附件");
    await wrapper.get('[data-testid="assignment-edit-title"]').setValue("单元复习-修订版");
    await wrapper.get('[data-testid="assignment-edit-description"]').setValue("新的作业说明");
    editDueAtPicker.vm.$emit("update:modelValue", "2026-05-03T20:00");
    await flushPromises();
    await wrapper.get('[data-testid="assignment-edit-status"]').setValue("published");
    await wrapper.get('[data-testid="assignment-save-submit"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("单元复习-修订版");
    expect(wrapper.text()).toContain("新的作业说明");
    expect(wrapper.text()).toContain("已发布");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments/9?classId=2",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"submissionMode":"folder"'),
      }),
    );
  });

  it("uploads assignment attachment and appends it to the list", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 2, name: "一年级二班" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 9,
          classId: 2,
          title: "单元复习",
          description: "",
          dueAt: "",
          status: "draft",
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          submissions: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
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
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>作业管理页</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/9");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="assignment-edit-open"]').trigger("click");
    await flushPromises();
    const file = new File(["attachment"], "习题答案.pdf", { type: "application/pdf" });
    const input = wrapper.get('[data-testid="assignment-attachment-input"]').element as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [file],
      configurable: true,
    });
    await wrapper.get('[data-testid="assignment-attachment-input"]').trigger("change");
    await flushPromises();

    expect(wrapper.text()).toContain("习题答案.pdf");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments/9/attachments?classId=2",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("deletes assignment attachment from the detail page", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 2, name: "一年级二班" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 9,
          classId: 2,
          title: "单元复习",
          description: "完成第 8 页题目",
          dueAt: "2026-05-01T12:00:00Z",
          status: "draft",
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
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
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          submissions: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>作业管理页</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/9");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="assignment-edit-open"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="assignment-attachment-delete-101"]').trigger("click");
    expect(wrapper.get('[data-testid="assignment-attachment-delete-dialog"]').exists()).toBe(true);
    await wrapper.get('[data-testid="assignment-attachment-delete-confirm"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).not.toContain("习题答案.pdf");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments/9/attachments/101?classId=2",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });

  it("deletes assignment and returns to the class assignments page", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 2, name: "一年级二班" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 9,
          classId: 2,
          title: "单元复习",
          description: "完成第 8 页题目",
          dueAt: "2026-05-01T12:00:00Z",
          status: "draft",
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          submissions: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments/classes/:classId", component: { template: "<div>作业管理页</div>" } },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentDetailView },
      ],
    });
    await router.push("/assignments/classes/2/9");
    await router.isReady();

    const wrapper = mount(AssignmentDetailView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="assignment-edit-open"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="assignment-delete-submit"]').trigger("click");
    expect(wrapper.get('[data-testid="assignment-delete-dialog"]').exists()).toBe(true);
    await wrapper.get('[data-testid="assignment-delete-confirm"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/assignments/classes/2");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments/9?classId=2",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });
});

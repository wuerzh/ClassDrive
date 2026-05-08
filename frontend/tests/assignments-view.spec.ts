import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { ElDatePicker } from "element-plus";
import AssignmentsView from "@/views/AssignmentsView.vue";

describe("AssignmentsView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders assignments home as management workspace with searchable dropdown", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        classes: [
          { id: 1, name: "一年级一班" },
          { id: 2, name: "一年级二班" },
        ],
      }),
    }));

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments", component: AssignmentsView },
        { path: "/assignments/classes/:classId", component: AssignmentsView },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentsView },
      ],
    });
    await router.push("/assignments");
    await router.isReady();

    const wrapper = mount(AssignmentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.find(".assignments-page__header").exists()).toBe(false);
    expect(wrapper.find('[data-testid="assignments-workspace"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="assignments-toolbar"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="assignment-class-select"]').exists()).toBe(true);
    const toolbarHtml = wrapper.get(".assignments-page__toolbar").html();
    expect(toolbarHtml.indexOf('data-testid="assignment-class-select"')).toBeLessThan(
      toolbarHtml.indexOf('data-testid="assignment-create-open"'),
    );
    expect(wrapper.find('[data-testid="assignment-sort-select"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="assignment-sort-title"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="assignment-sort-due"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="assignment-sort-updated"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="assignments-entry-directory"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("一年级一班");
  });

  it("renders class-scoped assignments as active workspace with toolbar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        classes: [
          { id: 1, name: "一年级一班" },
          { id: 2, name: "一年级二班" },
        ],
      }),
    }));

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments", component: AssignmentsView },
        { path: "/assignments/classes/:classId", component: AssignmentsView },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentsView },
      ],
    });
    await router.push("/assignments/classes/2");
    await router.isReady();

    const wrapper = mount(AssignmentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.text()).not.toContain("一年级二班 · 作业管理");
    expect(wrapper.find('[data-testid="assignments-workspace"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="assignments-toolbar"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="assignment-create-open"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-stats-open"]').text()).toBe("作业统计");
    expect(wrapper.get('[data-testid="assignment-stats-open"]').classes()).toContain("button--accent");
    expect(wrapper.find('[data-testid="assignment-missing-open"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="assignments-back"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="assignments-list-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="assignments-entry-directory"]').exists()).toBe(false);
  });

  it("loads class-scoped assignments list", async () => {
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
          assignments: [
            {
              id: 1,
              classId: 2,
              title: "第一单元口算练习",
              description: "完成第 12 页题目",
              dueAt: "2026-04-25T12:00:00Z",
              status: "draft",
              createdAt: "2026-04-23T08:00:00Z",
              updatedAt: "2026-04-23T08:00:00Z",
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments", component: AssignmentsView },
        { path: "/assignments/classes/:classId", component: AssignmentsView },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentsView },
      ],
    });
    await router.push("/assignments/classes/2");
    await router.isReady();

    const wrapper = mount(AssignmentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("第一单元口算练习");
    expect(wrapper.get('[data-testid="assignment-row-1"]').text()).not.toContain("完成第 12 页题目");
    expect(wrapper.find('[data-testid="assignments-list-head"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="assignment-summary-card-1"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="assignments-table"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignments-table"] thead').text()).toContain("截止时间");
    expect(wrapper.get('[data-testid="assignments-table"] thead').text()).toContain("更新时间");
    expect(wrapper.get('[data-testid="assignment-row-1"]').text()).not.toContain("截止时间");
    expect(wrapper.get('[data-testid="assignment-row-1"]').text()).not.toContain("更新时间");
    expect(wrapper.get('[data-testid="assignment-row-1"]').text()).toContain("未发布");
    expect(wrapper.get('[data-testid="assignment-publish-1"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-copy-open-1"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-detail-link-1"]').text()).toContain("详情/批改");
    expect(wrapper.get('[data-testid="assignment-row-1"]').text()).toContain("2026/4/23 16:00:00");
    const listPanelHtml = wrapper.get('[data-testid="assignments-list-panel"]').html();
    expect(listPanelHtml.indexOf('data-testid="assignment-pagination-summary"')).toBeLessThan(
      listPanelHtml.indexOf('data-testid="assignments-table"'),
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/assignments?classId=2", expect.any(Object));
  });

  it("refreshes the current assignment list from the toolbar", async () => {
    let assignmentRequestCount = 0;
    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/classes") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            classes: [
              { id: 2, name: "一年级二班" },
            ],
          }),
        };
      }
      if (input === "/api/assignments?classId=2") {
        assignmentRequestCount += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            assignments: [
              {
                id: 1,
                classId: 2,
                title: assignmentRequestCount === 1 ? "第一版作业" : "刷新后的作业",
                description: "",
                dueAt: "2026-04-25T12:00:00Z",
                status: "published",
                createdAt: "2026-04-23T08:00:00Z",
                updatedAt: "2026-04-23T08:00:00Z",
              },
            ],
          }),
        };
      }
      throw new Error(`unexpected request ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments", component: AssignmentsView },
        { path: "/assignments/classes/:classId", component: AssignmentsView },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentsView },
      ],
    });
    await router.push("/assignments/classes/2");
    await router.isReady();

    const wrapper = mount(AssignmentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    expect(wrapper.text()).toContain("第一版作业");

    await wrapper.get('[data-testid="assignment-refresh"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("刷新后的作业");
    expect(assignmentRequestCount).toBe(2);
  });

  it("creates assignment from dialog and appends it to the current class list", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 1, name: "一年级一班" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          assignments: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 3,
          classId: 1,
          title: "第二单元默写",
          description: "本周五前完成",
          dueAt: "2026-04-26T12:00:00Z",
          status: "published",
          submissionMode: "folder",
          minFileCount: 5,
          createdAt: "2026-04-23T09:00:00Z",
          updatedAt: "2026-04-23T09:00:00Z",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments", component: AssignmentsView },
        { path: "/assignments/classes/:classId", component: AssignmentsView },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentsView },
      ],
    });
    await router.push("/assignments/classes/1");
    await router.isReady();

    const pinia = createPinia();
    const wrapper = mount(AssignmentsView, {
      global: {
        plugins: [pinia, router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="assignment-create-open"]').trigger("click");
    const createRow = wrapper.get('[data-testid="assignment-create-row"]');
    expect(createRow.classes()).toContain("assignments-page__create-row");
    expect(createRow.html().indexOf('data-testid="assignment-create-title"')).toBeLessThan(
      createRow.html().indexOf('data-testid="assignment-create-status"'),
    );
    expect(createRow.html().indexOf('data-testid="assignment-create-status"')).toBeLessThan(
      createRow.html().indexOf('data-testid="assignment-create-due-at"'),
    );
    expect(createRow.find('[data-testid="assignment-create-submit"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="assignment-create-actions"]').find('[data-testid="assignment-create-submit"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-create-due-at-field"]').text()).not.toContain("截止时间");
    expect(wrapper.get('[data-testid="assignment-create-status-help"]').text()).toContain("未发布仅老师可见");
    const createDueAtPicker = wrapper.getComponent(ElDatePicker);
    expect(createDueAtPicker.props("type")).toBe("datetime");
    expect(createDueAtPicker.props("editable")).toBe(false);
    expect(createDueAtPicker.props("placeholder")).toBe("作业提交截止时间");
    expect(wrapper.get('[data-testid="assignment-create-due-at"]').classes()).toContain("app-datetime-input");
    expect(wrapper.get('[data-testid="assignment-create-due-at"]').attributes("type")).not.toBe("datetime-local");
    expect(wrapper.get('[data-testid="assignment-create-attachment-manager"]').text()).toContain("附件管理");
    expect(wrapper.get('[data-testid="assignment-create-attachment-manager"]').text()).toContain("添加附件");
    expect(wrapper.get('[data-testid="assignment-create-attachment-manager"]').text()).toContain("创建后启用");
    expect(wrapper.get('[data-testid="assignment-create-submission-mode"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-create-submission-type"]').text()).toContain("常用文件");
    expect(wrapper.get('[data-testid="assignment-create-submission-type"]').text()).toContain("图片文件");
    expect(wrapper.get('[data-testid="assignment-create-submission-type"]').text()).toContain("Word 文档");
    expect(wrapper.get('[data-testid="assignment-create-submission-type"]').text()).toContain("PDF 文件");
    expect(wrapper.get('[data-testid="assignment-create-submission-type"]').text()).toContain("压缩包");
    expect(wrapper.get('[data-testid="assignment-create-min-file-count"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-create-submit"]').text()).toBe("新建作业");
    expect(wrapper.find('[data-testid="assignment-create-and-edit-attachments"]').exists()).toBe(false);
    await wrapper.get('[data-testid="assignment-create-title"]').setValue("第二单元默写");
    await wrapper.get('[data-testid="assignment-create-description"]').setValue("本周五前完成");
    createDueAtPicker.vm.$emit("update:modelValue", "2026-04-26T20:00");
    await flushPromises();
    await wrapper.get('[data-testid="assignment-create-status"]').setValue("published");
    await wrapper.get('[data-testid="assignment-create-submission-mode"]').setValue("folder");
    await wrapper.get('[data-testid="assignment-create-submission-type"]').setValue("image");
    await wrapper.get('[data-testid="assignment-create-min-file-count"]').setValue("5");
    await wrapper.get('[data-testid="assignment-create-submit"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("第二单元默写");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          classId: 1,
          title: "第二单元默写",
          description: "本周五前完成",
          dueAt: "2026-04-26T12:00:00.000Z",
          status: "published",
          submissionMode: "folder",
          submissionTypeCategory: "image",
          minFileCount: 5,
        }),
      }),
    );
  });

  it("toggles publish state from the list row with distinct actions", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 1, name: "一年级一班" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          assignments: [
            {
              id: 7,
              classId: 1,
              title: "预习任务",
              description: "读课文",
              dueAt: "",
              status: "draft",
              submissionMode: "any",
              minFileCount: 1,
              createdAt: "2026-04-23T09:00:00Z",
              updatedAt: "2026-04-23T09:00:00Z",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 7,
          classId: 1,
          title: "预习任务",
          description: "读课文",
          dueAt: "",
          status: "published",
          submissionMode: "any",
          minFileCount: 1,
          createdAt: "2026-04-23T09:00:00Z",
          updatedAt: "2026-04-23T10:00:00Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 7,
          classId: 1,
          title: "预习任务",
          description: "读课文",
          dueAt: "",
          status: "draft",
          submissionMode: "any",
          minFileCount: 1,
          createdAt: "2026-04-23T09:00:00Z",
          updatedAt: "2026-04-23T10:30:00Z",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments", component: AssignmentsView },
        { path: "/assignments/classes/:classId", component: AssignmentsView },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentsView },
      ],
    });
    await router.push("/assignments/classes/1");
    await router.isReady();

    const wrapper = mount(AssignmentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="assignment-publish-7"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="assignment-row-7"]').text()).toContain("已发布");
    expect(wrapper.find('[data-testid="assignment-publish-7"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="assignment-unpublish-7"]').text()).toBe("取消发布");
    expect(wrapper.get('[data-testid="assignment-unpublish-7"]').classes()).toContain("button--warning");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments/7?classId=1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          title: "预习任务",
          description: "读课文",
          dueAt: "",
          status: "published",
          submissionMode: "any",
          submissionTypeCategory: "mixed",
          minFileCount: 1,
        }),
      }),
    );

    await wrapper.get('[data-testid="assignment-unpublish-7"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="assignment-row-7"]').text()).toContain("未发布");
    expect(wrapper.find('[data-testid="assignment-unpublish-7"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="assignment-publish-7"]').text()).toBe("发布");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments/7?classId=1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          title: "预习任务",
          description: "读课文",
          dueAt: "",
          status: "draft",
          submissionMode: "any",
          submissionTypeCategory: "mixed",
          minFileCount: 1,
        }),
      }),
    );
  });

  it("copies assignment basics to another or current class as an unpublished draft", async () => {
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
          assignments: [
            {
              id: 8,
              classId: 1,
              title: "同课作业",
              description: "统一练习",
              dueAt: "2026-04-26T12:00:00Z",
              status: "published",
              submissionMode: "folder",
              minFileCount: 5,
              createdAt: "2026-04-23T09:00:00Z",
              updatedAt: "2026-04-23T09:00:00Z",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 12,
          classId: 2,
          title: "同课作业",
          description: "统一练习",
          dueAt: "2026-04-26T12:00:00Z",
          status: "draft",
          submissionMode: "folder",
          minFileCount: 5,
          createdAt: "2026-04-23T10:00:00Z",
          updatedAt: "2026-04-23T10:00:00Z",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments", component: AssignmentsView },
        { path: "/assignments/classes/:classId", component: AssignmentsView },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentsView },
      ],
    });
    await router.push("/assignments/classes/1");
    await router.isReady();

    const wrapper = mount(AssignmentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="assignment-copy-open-8"]').trigger("click");
    await wrapper.get('[data-testid="assignment-copy-class"]').setValue("2");
    expect(wrapper.get('[data-testid="assignment-copy-help"]').text()).toContain("附件可在复制后进入详情上传");
    await wrapper.get('[data-testid="assignment-copy-submit"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assignments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          classId: 2,
          title: "同课作业",
          description: "统一练习",
          dueAt: "2026-04-26T12:00:00Z",
          status: "draft",
          submissionMode: "folder",
          submissionTypeCategory: "mixed",
          minFileCount: 5,
        }),
      }),
    );
    expect(wrapper.find('[data-testid="assignment-copy-dialog"]').exists()).toBe(false);
  });

  it("shows submitted and missing counts together and sorts statistic columns", async () => {
    const createObjectURL = vi.fn(() => "blob:missing-stats");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });
    const linkClicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function clickDownloadLink() {
      linkClicks.push(this.download);
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 1, name: "一年级一班" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          assignments: [
            {
              id: 3,
              classId: 1,
              title: "第二单元默写",
              description: "",
              dueAt: "2026-04-26T12:00:00Z",
              status: "published",
              createdAt: "2026-04-23T09:00:00Z",
              updatedAt: "2026-04-23T09:00:00Z",
            },
            {
              id: 4,
              classId: 1,
              title: "第三单元口算",
              description: "",
              dueAt: "2026-04-27T12:00:00Z",
              status: "published",
              createdAt: "2026-04-24T09:00:00Z",
              updatedAt: "2026-04-24T09:00:00Z",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          assignments: [
            {
              id: 3,
              classId: 1,
              title: "第二单元默写",
              description: "",
              dueAt: "2026-04-26T12:00:00Z",
              status: "published",
              createdAt: "2026-04-23T09:00:00Z",
              updatedAt: "2026-04-23T09:00:00Z",
            },
            {
              id: 4,
              classId: 1,
              title: "第三单元口算",
              description: "",
              dueAt: "2026-04-27T12:00:00Z",
              status: "published",
              createdAt: "2026-04-24T09:00:00Z",
              updatedAt: "2026-04-24T09:00:00Z",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classId: 1,
          assignmentIds: [3, 4],
          rosterTotal: 6,
          assignmentTotal: 2,
          expectedTotal: 12,
          submittedTotal: 2,
          missingTotal: 10,
          rows: [
            { studentId: 1, studentNo: "20260001", displayName: "张小明", submittedCount: 1, missingCount: 1 },
            { studentId: 2, studentNo: "20260002", displayName: "李小红", submittedCount: 1, missingCount: 1 },
            { studentId: 3, studentNo: "20260003", displayName: "王小兰", submittedCount: 0, missingCount: 2 },
            { studentId: 4, studentNo: "20260004", displayName: "赵小北", submittedCount: 0, missingCount: 2 },
            { studentId: 5, studentNo: "20260005", displayName: "周小南", submittedCount: 0, missingCount: 2 },
            { studentId: 6, studentNo: "20260006", displayName: "吴小西", submittedCount: 0, missingCount: 2 },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments", component: AssignmentsView },
        { path: "/assignments/classes/:classId", component: AssignmentsView },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentsView },
      ],
    });
    await router.push("/assignments/classes/1");
    await router.isReady();

    const wrapper = mount(AssignmentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="assignment-stats-open"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="assignment-missing-dialog"]').text()).toContain("作业统计");
    expect(wrapper.get('[data-testid="assignment-missing-dialog"]').text()).not.toContain("统计范围");
    const statsControls = wrapper.get('[data-testid="assignment-stats-controls"]');
    expect(statsControls.text()).not.toContain("统计类型");
    expect(statsControls.find('[data-testid="assignment-stats-mode-group"]').exists()).toBe(false);
    expect(statsControls.find('[data-testid="assignment-stats-submitted"]').exists()).toBe(false);
    expect(statsControls.find('[data-testid="assignment-stats-missing"]').exists()).toBe(false);
    expect(statsControls.find('[data-testid="assignment-missing-scope"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-stats-summary"]').text()).toContain("全班 6 人 · 已选 2 次作业 · 应交 12 份");
    const statsResultRow = wrapper.get('[data-testid="assignment-stats-result-row"]');
    expect(statsResultRow.find('[data-testid="assignment-stats-summary"]').exists()).toBe(true);
    expect(statsResultRow.find('[data-testid="assignment-missing-export"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-missing-scope-help"]').text()).toContain("已交与未交次数");
    expect(wrapper.get('[data-testid="assignment-missing-option-3"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-missing-option-4"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-missing-pagination-summary"]').text()).toContain("第 1 / 1 页 · 共 6 条");
    const missingDialogHtml = wrapper.get('[data-testid="assignment-missing-dialog"]').html();
    expect(missingDialogHtml.indexOf('data-testid="assignment-missing-pagination-summary"')).toBeLessThan(
      missingDialogHtml.indexOf('data-testid="assignment-missing-table"'),
    );
    expect(wrapper.get('[data-testid="assignment-missing-table"]').text()).toContain("张小明");
    expect(wrapper.get('[data-testid="assignment-missing-table"]').text()).toContain("周小南");
    expect(wrapper.get('[data-testid="assignment-missing-table"]').text()).toContain("李小红");
    expect(wrapper.get('[data-testid="assignment-missing-table"]').text()).toContain("已交次数");
    expect(wrapper.get('[data-testid="assignment-missing-table"]').text()).toContain("未交次数");
    expect(wrapper.get('[data-testid="assignment-stats-sort-student-no"]').text()).toContain("学号");
    let visibleRows = wrapper.findAll('[data-testid="assignment-missing-table"] tbody tr');
    expect(visibleRows[0].text()).toContain("王小兰");
    expect(visibleRows[0].text()).toContain("0");
    expect(visibleRows[0].text()).toContain("2");
    await wrapper.get('[data-testid="assignment-stats-sort-student-no"]').trigger("click");
    await flushPromises();
    visibleRows = wrapper.findAll('[data-testid="assignment-missing-table"] tbody tr');
    expect(visibleRows[0].text()).toContain("张小明");
    expect(visibleRows[0].text()).toContain("20260001");
    await wrapper.get('[data-testid="assignment-stats-sort-student-no"]').trigger("click");
    await flushPromises();
    visibleRows = wrapper.findAll('[data-testid="assignment-missing-table"] tbody tr');
    expect(visibleRows[0].text()).toContain("吴小西");
    expect(visibleRows[0].text()).toContain("20260006");
    await wrapper.get('[data-testid="assignment-stats-sort-submitted"]').trigger("click");
    await flushPromises();
    visibleRows = wrapper.findAll('[data-testid="assignment-missing-table"] tbody tr');
    expect(visibleRows[0].text()).toContain("张小明");
    expect(visibleRows[1].text()).toContain("李小红");
    await wrapper.get('[data-testid="assignment-stats-sort-submitted"]').trigger("click");
    await flushPromises();
    visibleRows = wrapper.findAll('[data-testid="assignment-missing-table"] tbody tr');
    expect(visibleRows[0].text()).toContain("王小兰");
    await wrapper.get('[data-testid="assignment-stats-sort-missing"]').trigger("click");
    await flushPromises();
    visibleRows = wrapper.findAll('[data-testid="assignment-missing-table"] tbody tr');
    expect(visibleRows[0].text()).toContain("王小兰");
    await wrapper.get('[data-testid="assignment-missing-export"]').trigger("click");
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:missing-stats");
    expect(linkClicks).toContain("一年级一班-作业统计.xls");
    expect(fetchMock).toHaveBeenCalledWith("/api/assignments/statistics?classId=1&assignmentIds=3%2C4", expect.any(Object));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/students?classId=1&page=1&pageSize=100", expect.any(Object));
  });

  it("uses the backend statistics snapshot for large assignment statistics", async () => {
    const students = Array.from({ length: 101 }, (_, index) => {
      const id = index + 1;
      return {
        id,
        classId: 1,
        studentNo: String(20260000 + id),
        displayName: `学生${id}`,
      };
    });
    const assignment = {
      id: 3,
      classId: 1,
      title: "第二单元默写",
      description: "",
      dueAt: "2026-04-26T12:00:00Z",
      status: "published",
      createdAt: "2026-04-23T09:00:00Z",
      updatedAt: "2026-04-23T09:00:00Z",
    };
    const fetchMock = vi.fn((url: RequestInfo | URL) => {
      const requestUrl = String(url);
      if (requestUrl === "/api/classes") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ classes: [{ id: 1, name: "一年级一班" }] }),
        });
      }
      if (requestUrl === "/api/assignments?classId=1" || requestUrl === "/api/assignments?classId=1&page=1&pageSize=100") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            assignments: [assignment],
            pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          }),
        });
      }
      if (requestUrl === "/api/assignments/statistics?classId=1&assignmentIds=3") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            classId: 1,
            assignmentIds: [3],
            rosterTotal: 101,
            assignmentTotal: 1,
            expectedTotal: 101,
            submittedTotal: 101,
            missingTotal: 0,
            rows: students.map((student) => ({
              studentId: student.id,
              studentNo: student.studentNo,
              displayName: student.displayName,
              submittedCount: 1,
              missingCount: 0,
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
        { path: "/assignments", component: AssignmentsView },
        { path: "/assignments/classes/:classId", component: AssignmentsView },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentsView },
      ],
    });
    await router.push("/assignments/classes/1");
    await router.isReady();

    const wrapper = mount(AssignmentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="assignment-stats-open"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="assignment-stats-summary"]').text()).toContain("全班 101 人 · 已选 1 次作业 · 应交 101 份");
    expect(wrapper.get('[data-testid="assignment-missing-pagination-summary"]').text()).toContain("共 101 条");
    expect(fetchMock).toHaveBeenCalledWith("/api/assignments/statistics?classId=1&assignmentIds=3", expect.any(Object));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/students?classId=1&page=1&pageSize=100", expect.any(Object));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/assignments/3/submissions?classId=1&page=1&pageSize=100", expect.any(Object));

    await wrapper.get('[data-testid="assignment-missing-page-next"]').trigger("click");
    await wrapper.get('[data-testid="assignment-missing-page-next"]').trigger("click");
    await wrapper.get('[data-testid="assignment-missing-page-next"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="assignment-missing-pagination-summary"]').text()).toContain("第 4 / 4 页");
    expect(wrapper.get('[data-testid="assignment-missing-table"]').text()).toContain("学生101");
  });

  it("opens submission archive download dialog for selected or all assignments", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 1, name: "一年级一班" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          assignments: [
            {
              id: 3,
              classId: 1,
              title: "第一单元",
              description: "",
              dueAt: "2026-04-26T12:00:00Z",
              status: "published",
              createdAt: "2026-04-24T09:00:00Z",
              updatedAt: "2026-04-24T09:00:00Z",
            },
            {
              id: 4,
              classId: 1,
              title: "第二单元",
              description: "",
              dueAt: "2026-04-27T12:00:00Z",
              status: "published",
              createdAt: "2026-04-24T10:00:00Z",
              updatedAt: "2026-04-24T10:00:00Z",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          assignments: [
            {
              id: 3,
              classId: 1,
              title: "第一单元",
              description: "",
              dueAt: "2026-04-26T12:00:00Z",
              status: "published",
              createdAt: "2026-04-24T09:00:00Z",
              updatedAt: "2026-04-24T09:00:00Z",
            },
            {
              id: 4,
              classId: 1,
              title: "第二单元",
              description: "",
              dueAt: "2026-04-27T12:00:00Z",
              status: "published",
              createdAt: "2026-04-24T10:00:00Z",
              updatedAt: "2026-04-24T10:00:00Z",
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments", component: AssignmentsView },
        { path: "/assignments/classes/:classId", component: AssignmentsView },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentsView },
      ],
    });
    await router.push("/assignments/classes/1");
    await router.isReady();

    const wrapper = mount(AssignmentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="assignment-submissions-download-open"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="assignment-submissions-download-dialog"]').text()).toContain("作业提交包");
    expect(wrapper.get('[data-testid="assignment-submissions-download-help"]').text()).toContain("提交清单");
    expect(wrapper.get('[data-testid="assignment-submissions-download-help"]').text()).toContain("未提交清单");
    expect(wrapper.get('[data-testid="assignment-submissions-download-selected"]').attributes("href")).toBe(
      "/api/assignments/submissions/archive?classId=1&assignmentIds=3%2C4",
    );
    expect(wrapper.get('[data-testid="assignment-submissions-download-all"]').attributes("href")).toBe(
      "/api/assignments/submissions/archive?classId=1",
    );
    await wrapper.get('[data-testid="assignment-submissions-download-option-4"]').setValue(false);
    expect(wrapper.get('[data-testid="assignment-submissions-download-selected"]').attributes("href")).toBe(
      "/api/assignments/submissions/archive?classId=1&assignmentIds=3",
    );
    expect(wrapper.get('[data-testid="assignment-submissions-download-selected"]').attributes("aria-disabled")).toBe("false");
    await wrapper.get('[data-testid="assignment-submissions-download-option-3"]').setValue(false);
    expect(wrapper.get('[data-testid="assignment-submissions-download-selected"]').attributes("href")).toBe("#");
    expect(wrapper.get('[data-testid="assignment-submissions-download-selected"]').attributes("aria-disabled")).toBe("true");
  });

  it("switches class and reloads assignments", async () => {
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
          assignments: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          assignments: [
            {
              id: 8,
              classId: 2,
              title: "班级二作业",
              description: "",
              dueAt: "",
              status: "draft",
              createdAt: "2026-04-23T10:00:00Z",
              updatedAt: "2026-04-23T10:00:00Z",
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments", component: AssignmentsView },
        { path: "/assignments/classes/:classId", component: AssignmentsView },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentsView },
      ],
    });
    await router.push("/assignments/classes/1");
    await router.isReady();

    const wrapper = mount(AssignmentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="assignment-class-select-trigger"]').trigger("click");
    await wrapper.get('[data-testid="assignment-class-select-option-2"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/assignments/classes/2");
    expect(wrapper.text()).toContain("班级二作业");
    expect(fetchMock).toHaveBeenCalledWith("/api/assignments?classId=2", expect.any(Object));
  });

  it("renders assignment detail entry for each class assignment", async () => {
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
          assignments: [
            {
              id: 9,
              classId: 2,
              title: "单元复习",
              description: "",
              dueAt: "",
              status: "draft",
              createdAt: "2026-04-23T10:00:00Z",
              updatedAt: "2026-04-23T10:00:00Z",
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments", component: AssignmentsView },
        { path: "/assignments/classes/:classId", component: AssignmentsView },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentsView },
      ],
    });
    await router.push("/assignments/classes/2");
    await router.isReady();

    const wrapper = mount(AssignmentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="assignment-detail-link-9"]').attributes("href")).toBe("/assignments/classes/2/9");
    await wrapper.get('[data-testid="assignment-row-9"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/assignments/classes/2/9");
  });

  it("sorts assignments from table headers while keeping the detail route", async () => {
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
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          assignments: [
            {
              id: 9,
              classId: 2,
              title: "单元复习",
              description: "",
              dueAt: "2026-04-25T12:00:00Z",
              status: "draft",
              createdAt: "2026-04-23T10:00:00Z",
              updatedAt: "2026-04-23T10:00:00Z",
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/assignments", component: AssignmentsView },
        { path: "/assignments/classes/:classId", component: AssignmentsView },
        { path: "/assignments/classes/:classId/:assignmentId", component: AssignmentsView },
      ],
    });
    await router.push("/assignments/classes/2");
    await router.isReady();

    const wrapper = mount(AssignmentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    expect(wrapper.find('[data-testid="assignment-sort-select"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="assignment-detail-link-9"]').attributes("href")).toBe("/assignments/classes/2/9");

    await wrapper.get('[data-testid="assignment-sort-title"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("title-asc");

    await wrapper.get('[data-testid="assignment-sort-title"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("title-desc");

    await wrapper.get('[data-testid="assignment-sort-due"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("dueAt-asc");

    await wrapper.get('[data-testid="assignment-sort-updated"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("updated-desc");

    await wrapper.get('[data-testid="assignment-sort-updated"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("updated-asc");
  });
});

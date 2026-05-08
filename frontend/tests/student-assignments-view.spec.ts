import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import StudentAssignmentsView from "@/views/StudentAssignmentsView.vue";

describe("StudentAssignmentsView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  it("renders published assignments with submission status", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        submissionConstraints: {
          allowedTypesLabel: "PDF、Word、Excel、PPT、TXT、JPG、PNG、ZIP",
          maxFileSizeBytes: 100 * 1024 * 1024,
          maxFileSizeLabel: "100 MB",
        },
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
            title: "第二单元默写",
            description: "已提交",
            dueAt: "2026-05-02T12:00:00Z",
            status: "published",
            createdAt: "2026-04-23T10:00:00Z",
            updatedAt: "2026-04-23T10:30:00Z",
            overdue: false,
            submission: {
              id: 1,
              status: "submitted",
              submittedAt: "2026-04-30T08:00:00Z",
              updatedAt: "2026-04-30T08:00:00Z",
            },
          },
          {
            id: 11,
            classId: 1,
            title: "第三单元练习",
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
            id: 12,
            classId: 1,
            title: "第四单元口算",
            description: "已截止未提交",
            dueAt: "2026-04-19T12:00:00Z",
            status: "published",
            createdAt: "2026-04-19T10:00:00Z",
            updatedAt: "2026-04-19T10:30:00Z",
            overdue: true,
            submission: null,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/student/assignments", component: StudentAssignmentsView },
        { path: "/student/assignments/:assignmentId", component: { template: "<div>详情页</div>" } },
      ],
    });
    await router.push("/student/assignments");
    await router.isReady();

    const wrapper = mount(StudentAssignmentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("第一单元练习");
    expect(wrapper.find(".classes-page__header").exists()).toBe(false);
    expect(wrapper.find(".classes-page__eyebrow").exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-assignments-compact-list"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-assignments-workspace"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="student-assignments-table"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="student-assignment-row-9"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="student-assignments-empty"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("未提交");
    expect(wrapper.text()).toContain("已提交");
    expect(wrapper.text()).toContain("已截止（已提交）");
    expect(wrapper.text()).toContain("已截止");
    expect(wrapper.text()).not.toContain("单个文件不超过 100 MB");
    expect(wrapper.text()).not.toContain("可提交多个文件或一个文件夹");
    expect(wrapper.text()).not.toContain("学生作业");
    expect(wrapper.get('[data-testid="student-assignment-row-9"]').attributes("role")).toBe("link");
    expect(wrapper.get('[data-testid="student-assignment-row-9"]').classes()).toContain("student-assignment-row--clickable");
    expect(wrapper.get('[data-testid="student-assignments-table"]').text()).toContain("发布时间");
    expect(wrapper.get('[data-testid="student-assignments-table"]').text()).toContain("截止时间");
    expect(wrapper.get('[data-testid="student-assignments-table"]').text()).toContain("提交状态");
    expect(wrapper.get('[data-testid="student-assignment-row-published-9"]').text()).toContain("2026");
    expect(wrapper.get('[data-testid="student-assignment-row-due-9"]').text()).toContain("2026");
    expect(wrapper.get('[data-testid="student-assignment-row-status-9"]').text()).toContain("未提交");
    expect(wrapper.get('[data-testid="student-assignment-row-9"]').text()).not.toContain("完成第 8 页");
    expect(wrapper.get('[data-testid="student-assignment-link-9"]').attributes("href")).toBe("/student/assignments/9");

    await wrapper.get('[data-testid="student-assignment-row-9"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/student/assignments/9");
    expect(fetchMock).toHaveBeenCalledWith("/api/student/assignments", expect.any(Object));
  });
});

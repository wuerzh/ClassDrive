import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import TeacherUsersView from "@/views/TeacherUsersView.vue";
import TeacherUserDetailView from "@/views/TeacherUserDetailView.vue";
import { useAuthStore } from "@/stores/auth";

function mockJsonSequence(responses: Array<unknown>) {
  const fetchMock = vi.fn();
  for (const body of responses) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => body,
    });
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("TeacherUsers views", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  it("loads teacher list and creates a new teacher account", async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 1,
      username: "teacher",
      displayName: "示例老师",
      role: "owner",
    };

    const fetchMock = mockJsonSequence([
      {
        teachers: [
          { id: 1, username: "teacher", displayName: "示例老师", role: "owner", disabled: false },
        ],
      },
      {
        teacher: { id: 2, username: "math", displayName: "数学老师", role: "staff", disabled: false },
      },
    ]);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/settings/teachers", component: TeacherUsersView },
        { path: "/settings/teachers/:teacherId", component: TeacherUserDetailView },
      ],
    });
    await router.push("/settings/teachers");
    await router.isReady();

    const wrapper = mount(TeacherUsersView, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="teacher-users-create-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="teacher-users-list-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="teacher-users-create-intro"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="teacher-users-list-intro"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="teacher-role-help"]').text()).toContain("普通老师管教学");
    expect(wrapper.get('[data-testid="teacher-role-help"]').text()).toContain("系统负责人管系统和账号");
    const createPanelHtml = wrapper.get('[data-testid="teacher-users-create-panel"]').html();
    expect(createPanelHtml.indexOf('data-testid="teacher-role-help"')).toBeLessThan(createPanelHtml.indexOf('class="app-field-grid"'));
    expect(wrapper.get('[data-testid="teacher-card-row-1"]').classes()).toContain("teacher-card--row");
    expect(wrapper.find('[data-testid="teacher-card-meta-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="teacher-card-primary-actions-1"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("示例老师");

    await wrapper.get('[data-testid="teacher-create-username"]').setValue("math");
    await wrapper.get('[data-testid="teacher-create-display-name"]').setValue("数学老师");
    await wrapper.get('[data-testid="teacher-create-password"]').setValue("math12345");
    await wrapper.get('[data-testid="teacher-create-role"]').setValue("staff");
    await wrapper.get('[data-testid="teacher-create-submit"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/teachers",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({
          username: "math",
          displayName: "数学老师",
          password: "math12345",
          role: "staff",
        }),
      }),
    );
    expect(wrapper.text()).toContain("数学老师");
  });

  it("opens teacher detail as a dialog without replacing the teacher list", async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 1,
      username: "teacher",
      displayName: "示例老师",
      role: "owner",
    };

    mockJsonSequence([
      {
        teachers: [
          { id: 1, username: "teacher", displayName: "示例老师", role: "owner", disabled: false },
          { id: 2, username: "math", displayName: "数学老师", role: "staff", disabled: false },
        ],
      },
      {
        teacher: { id: 2, username: "math", displayName: "数学老师", role: "staff", disabled: false },
      },
    ]);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/settings/teachers", component: TeacherUsersView },
        { path: "/settings/teachers/:teacherId", component: TeacherUserDetailView },
      ],
    });
    await router.push("/settings/teachers");
    await router.isReady();

    const wrapper = mount(TeacherUsersView, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    await wrapper.get('[data-testid="teacher-detail-open-2"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/settings/teachers");
    expect(wrapper.find('[data-testid="teacher-users-list-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="teacher-detail-dialog"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="teacher-detail-summary-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="teacher-detail-form-panel"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("数学老师");

    await wrapper.get('[data-testid="teacher-detail-close"]').trigger("click");

    expect(wrapper.find('[data-testid="teacher-detail-dialog"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="teacher-users-list-panel"]').exists()).toBe(true);
  });

  it("loads teacher detail and updates role and disabled state", async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 1,
      username: "teacher",
      displayName: "示例老师",
      role: "owner",
    };

    const fetchMock = mockJsonSequence([
      {
        teacher: { id: 2, username: "math", displayName: "数学老师", role: "staff", disabled: false },
      },
      {
        teacher: { id: 2, username: "math", displayName: "数学组老师", role: "owner", disabled: true },
      },
    ]);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/settings/teachers/:teacherId", component: TeacherUserDetailView }],
    });
    await router.push("/settings/teachers/2");
    await router.isReady();

    const wrapper = mount(TeacherUserDetailView, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="teacher-detail-summary-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="teacher-detail-form-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="teacher-detail-summary-intro"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="teacher-detail-form-intro"]').exists()).toBe(true);
    await wrapper.get('[data-testid="teacher-detail-display-name"]').setValue("数学组老师");
    await wrapper.get('[data-testid="teacher-detail-role"]').setValue("owner");
    await wrapper.get('[data-testid="teacher-detail-disabled"]').setValue(true);
    await wrapper.get('[data-testid="teacher-detail-save"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/teachers/2",
      expect.objectContaining({
        method: "PATCH",
        credentials: "same-origin",
        body: JSON.stringify({
          displayName: "数学组老师",
          role: "owner",
          disabled: true,
        }),
      }),
    );
    expect(wrapper.text()).toContain("已停用");
  });
});

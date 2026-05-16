import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import ClassesView from "@/views/ClassesView.vue";

describe("ClassesView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  it("renders class management dashboard with toolbar dialogs from classes api", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        classes: [
          { id: 1, name: "一年级一班", joinCode: "", joinCodeStatus: "inactive", joinCodeHint: "", registrationEnabled: false },
          { id: 2, name: "一年级二班", joinCode: "", joinCodeStatus: "inactive", joinCodeHint: "", registrationEnabled: false },
        ],
      }),
    }));

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/classes", component: ClassesView },
        { path: "/files/classes/:classId", component: { template: "<div />" } },
        { path: "/assignments/classes/:classId", component: { template: "<div />" } },
        { path: "/students", component: { template: "<div />" } },
      ],
    });
    await router.push("/classes");
    await router.isReady();

    const wrapper = mount(ClassesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.find(".classes-page__header").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("共 2 个班级");
    expect(wrapper.text()).toContain("一年级一班");
    expect(wrapper.find('[data-testid="classes-management-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="classes-toolbar"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="classes-table"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="classes-overview-strip"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="classes-sort-select"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="class-sort-name"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="class-sort-registration"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="class-row-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="class-row-status-1"]').text()).toContain("未生成");
    expect(wrapper.find('[data-testid="class-row-actions-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="class-students-1"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="class-registration-toggle-1"]').classes()).toContain("button--secondary");
    expect(wrapper.find('[data-testid="classes-quick-create"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="class-create-open"]').exists()).toBe(true);
    const panelHtml = wrapper.get('[data-testid="classes-management-panel"]').html();
    expect(panelHtml.indexOf('data-testid="classes-pagination-summary"')).toBeLessThan(
      panelHtml.indexOf('data-testid="classes-table"'),
    );
    expect(wrapper.text()).not.toContain("第二阶段前骨架");
    expect(wrapper.text()).not.toContain("后续接入");
  });

  it("creates a class from dialog and appends it to the list", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 1, name: "一年级一班", joinCode: "", joinCodeStatus: "inactive", joinCodeHint: "", registrationEnabled: false },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 3,
          name: "三年级一班",
          joinCode: "",
          joinCodeStatus: "inactive",
          joinCodeHint: "",
          registrationEnabled: false,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/classes", component: ClassesView },
        { path: "/files/classes/:classId", component: { template: "<div />" } },
        { path: "/assignments/classes/:classId", component: { template: "<div />" } },
        { path: "/students", component: { template: "<div />" } },
      ],
    });
    await router.push("/classes");
    await router.isReady();

    const wrapper = mount(ClassesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="class-create-open"]').trigger("click");
    await wrapper.get('[data-testid="class-create-input"]').setValue("三年级一班");
    await wrapper.get('[data-testid="class-create-confirm"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("三年级一班");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/classes",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("edits and deletes classes through dialogs", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 1, name: "一年级一班", joinCode: "", joinCodeStatus: "inactive", joinCodeHint: "", registrationEnabled: false },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 1,
          name: "一年级一班-修改",
          joinCode: "",
          joinCodeStatus: "inactive",
          joinCodeHint: "",
          registrationEnabled: false,
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
        { path: "/classes", component: ClassesView },
        { path: "/files/classes/:classId", component: { template: "<div />" } },
        { path: "/assignments/classes/:classId", component: { template: "<div />" } },
        { path: "/students", component: { template: "<div />" } },
      ],
    });
    await router.push("/classes");
    await router.isReady();

    const wrapper = mount(ClassesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    await wrapper.get('[data-testid="class-edit-1"]').trigger("click");
    await wrapper.get('[data-testid="class-edit-input"]').setValue("一年级一班-修改");
    await wrapper.get('[data-testid="class-edit-confirm"]').trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("一年级一班-修改");

    await wrapper.get('[data-testid="class-delete-1"]').trigger("click");
    expect(wrapper.get('[data-testid="class-delete-dialog"]').text()).toContain("删除班级");
    expect(wrapper.get('[data-testid="class-delete-dialog"]').text()).toContain("学生");
    expect(wrapper.get('[data-testid="class-delete-dialog"]').text()).toContain("作业");
    expect(wrapper.get('[data-testid="class-delete-dialog"]').text()).toContain("附件");
    expect(wrapper.get('[data-testid="class-delete-dialog"]').text()).toContain("提交");
    expect(wrapper.get('[data-testid="class-delete-dialog"]').text()).toContain("班级资料");
    expect(wrapper.get('[data-testid="class-delete-dialog"]').text()).not.toContain("只能删除空班级");
    expect(wrapper.get('[data-testid="class-delete-dialog"]').text()).not.toContain("系统会阻止删除");
    expect(wrapper.get('[data-testid="class-delete-dialog"]').text()).not.toContain("当前实现");
    await wrapper.get('[data-testid="class-delete-confirm"]').trigger("click");
    await flushPromises();
    expect(wrapper.text()).not.toContain("一年级一班-修改");
  });

  it("refreshes join code for a class", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 1, name: "一年级一班", joinCode: "", joinCodeStatus: "inactive", joinCodeHint: "", registrationEnabled: false },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          joinCode: "4721",
          joinCodeHint: "4721",
          joinCodeStatus: "active",
          registrationEnabled: true,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/classes", component: ClassesView },
        { path: "/files/classes/:classId", component: { template: "<div />" } },
        { path: "/assignments/classes/:classId", component: { template: "<div />" } },
        { path: "/students", component: { template: "<div />" } },
      ],
    });
    await router.push("/classes");
    await router.isReady();

    const wrapper = mount(ClassesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="class-registration-toggle-1"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("4721");
    expect(wrapper.get('[data-testid="class-registration-toggle-1"]').text()).toContain("关闭注册");
    expect(wrapper.get('[data-testid="class-registration-toggle-1"]').classes()).toContain("button--accent");
  });

  it("keeps only class-specific management actions in class rows", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
          classes: [
            { id: 1, name: "一年级一班", joinCode: "", joinCodeStatus: "inactive", joinCodeHint: "", registrationEnabled: false },
          ],
        }),
    }));

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/classes", component: ClassesView },
        { path: "/files/classes/:classId", component: { template: "<div />" } },
        { path: "/assignments/classes/:classId", component: { template: "<div />" } },
        { path: "/students", component: { template: "<div />" } },
      ],
    });
    await router.push("/classes");
    await router.isReady();

    const wrapper = mount(ClassesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="classes-table"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="class-registration-toggle-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="class-students-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="class-edit-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="class-delete-1"]').exists()).toBe(true);
  });

  it("opens a class-scoped student management drawer from the actions column", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 1, name: "一年级一班", joinCode: "", joinCodeStatus: "inactive", joinCodeHint: "", registrationEnabled: false },
            { id: 2, name: "24家具1班", joinCode: "4721", joinCodeStatus: "active", joinCodeHint: "4721", registrationEnabled: true },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          students: [
            { id: 21, classId: 2, studentNo: "20240001", displayName: "李小红", activatedAt: "" },
          ],
          pagination: {
            page: 1,
            pageSize: 30,
            total: 1,
            totalPages: 1,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          students: [
            { id: 22, classId: 2, studentNo: "20240002", displayName: "王小兰", activatedAt: "2026-05-01T08:00:00Z" },
          ],
          pagination: {
            page: 1,
            pageSize: 30,
            total: 1,
            totalPages: 1,
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/classes", component: ClassesView },
        { path: "/files/classes/:classId", component: { template: "<div />" } },
        { path: "/assignments/classes/:classId", component: { template: "<div />" } },
        { path: "/students", redirect: "/classes" },
      ],
    });
    await router.push("/classes");
    await router.isReady();

    const wrapper = mount(ClassesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="class-students-2"]').trigger("click");
    await flushPromises();

    const drawer = wrapper.get('[data-testid="class-students-drawer"]');
    expect(drawer.text()).toContain("24家具1班");
    expect(drawer.text()).toContain("开放注册");
    expect(drawer.find('[data-testid="students-class-select"]').exists()).toBe(false);
    expect(drawer.get('[data-testid="students-table"]').text()).toContain("李小红");
    expect(fetchMock).toHaveBeenCalledWith("/api/students?classId=2", expect.any(Object));

    await drawer.get('[data-testid="student-registration-filter"]').setValue("registered");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith("/api/students?classId=2&registration=registered", expect.any(Object));
    expect(drawer.get('[data-testid="students-table"]').text()).toContain("王小兰");

    await drawer.get('[data-testid="class-students-drawer-close"]').trigger("click");
    expect(wrapper.find('[data-testid="class-students-drawer"]').exists()).toBe(false);
  });

  it("sorts classes from table headers instead of a standalone dropdown", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        classes: [
          { id: 1, name: "一年级一班", joinCode: "", joinCodeStatus: "inactive", joinCodeHint: "", registrationEnabled: false },
          { id: 2, name: "一年级二班", joinCode: "4721", joinCodeStatus: "active", joinCodeHint: "4721", registrationEnabled: true },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/classes", component: ClassesView },
        { path: "/files/classes/:classId", component: { template: "<div />" } },
        { path: "/assignments/classes/:classId", component: { template: "<div />" } },
        { path: "/students", component: { template: "<div />" } },
      ],
    });
    await router.push("/classes");
    await router.isReady();

    const wrapper = mount(ClassesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    expect(wrapper.find('[data-testid="classes-sort-select"]').exists()).toBe(false);

    await wrapper.get('[data-testid="class-sort-name"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("name-desc");

    await wrapper.get('[data-testid="class-sort-name"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("name-asc");

    await wrapper.get('[data-testid="class-sort-registration"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("registration-desc");

    await wrapper.get('[data-testid="class-sort-registration"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("registration-asc");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import StudentsView from "@/views/StudentsView.vue";

describe("StudentsView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  it("renders student roster with toolbar dialogs and allows adding student", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 1, name: "一年级一班", joinCodeStatus: "active", joinCodeHint: "4721", joinCode: "4721", registrationEnabled: true },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          students: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 1,
          classId: 1,
          studentNo: "20260001",
          displayName: "张小明",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/students", component: StudentsView }],
    });
    await router.push("/students?classId=1");
    await router.isReady();

    const wrapper = mount(StudentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    expect(wrapper.find(".students-page__header").exists()).toBe(false);
    expect(wrapper.find('[data-testid="students-workbench"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="students-toolbar"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="students-table"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="student-create-open"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="students-class-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="students-quick-create"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="students-roster-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="students-roster-head"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-sort-select"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-sort-number"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="student-sort-name"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="student-sort-registration"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="students-class-intro"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="students-create-intro"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="students-list-intro"]').exists()).toBe(false);
    const toolbarText = wrapper.get(".students-page__toolbar").text();
    expect(toolbarText.indexOf("一年级一班")).toBeLessThan(toolbarText.indexOf("新增学生"));
    expect(toolbarText.indexOf("一年级一班")).toBeLessThan(toolbarText.indexOf("导入学生"));
    const searchGroup = wrapper.get(".students-page__search-group");
    expect(searchGroup.find('[data-testid="student-registration-filter"]').exists()).toBe(true);
    expect(searchGroup.html().indexOf('data-testid="student-registration-filter"')).toBeLessThan(
      searchGroup.html().indexOf('data-testid="student-search-input"'),
    );
    await wrapper.get('[data-testid="student-import-open"]').trigger("click");
    const importUploadStep = wrapper.get('[data-testid="student-import-step-upload"]');
    const importUploadCard = wrapper.get('[data-testid="student-import-upload-card"]');
    expect(importUploadCard.element.closest('[data-testid="student-import-step-upload"]')).toBe(importUploadStep.element);
    expect(importUploadStep.text()).toContain("导入文件");
    await wrapper.get('[data-testid="student-import-cancel-top"]').trigger("click");
    await wrapper.get('[data-testid="student-create-open"]').trigger("click");
    expect(wrapper.get('[data-testid="student-edit-dialog"]').text()).toContain("班级：一年级一班");
    expect(wrapper.get('[data-testid="student-edit-dialog"]').text()).not.toContain("为 一年级一班 新增学生");
    await wrapper.get('[data-testid="student-edit-no"]').setValue("20260001");
    await wrapper.get('[data-testid="student-edit-name"]').setValue("张小明");
    await wrapper.get('[data-testid="student-edit-confirm"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("张小明");
    expect(wrapper.find('[data-testid="student-row-1"]').exists()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/students",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("edits and deletes students", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 1, name: "一年级一班", joinCodeStatus: "active", joinCodeHint: "4721", joinCode: "4721", registrationEnabled: true },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          students: [
            { id: 1, classId: 1, studentNo: "20260001", displayName: "张小明" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 1,
          classId: 1,
          studentNo: "20260011",
          displayName: "张小明-更新",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
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
      routes: [{ path: "/students", component: StudentsView }],
    });
    await router.push("/students?classId=1");
    await router.isReady();

    const wrapper = mount(StudentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    expect(wrapper.find('[data-testid="students-table"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="student-row-actions-1"]').exists()).toBe(true);
    await wrapper.get('[data-testid="student-edit-1"]').trigger("click");
    expect(wrapper.get('[data-testid="student-edit-dialog"]').exists()).toBe(true);
    await wrapper.get('[data-testid="student-edit-no"]').setValue("20260011");
    await wrapper.get('[data-testid="student-edit-name"]').setValue("张小明-更新");
    await wrapper.get('[data-testid="student-edit-confirm"]').trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("张小明-更新");

    await wrapper.get('[data-testid="student-delete-1"]').trigger("click");
    expect(wrapper.get('[data-testid="student-delete-dialog"]').exists()).toBe(true);
    await wrapper.get('[data-testid="student-delete-confirm"]').trigger("click");
    await flushPromises();
    expect(wrapper.text()).not.toContain("张小明-更新");

    expect(wrapper.text()).not.toContain("张小明-更新");
  });

  it("resets a student password to the default password from the actions column", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 1, name: "一年级一班", joinCodeStatus: "active", joinCodeHint: "4721", joinCode: "4721", registrationEnabled: true },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          students: [
            { id: 1, classId: 1, studentNo: "20260001", displayName: "张小明", activatedAt: "2026-05-01T08:00:00Z" },
          ],
          pagination: { page: 1, pageSize: 30, total: 1, totalPages: 1 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          student: { id: 1, classId: 1, studentNo: "20260001", displayName: "张小明", activatedAt: "2026-05-07T06:00:00Z" },
          defaultPassword: "123456",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/students", component: StudentsView }],
    });
    await router.push("/students?classId=1");
    await router.isReady();

    const wrapper = mount(StudentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    expect(wrapper.get('[data-testid="student-reset-password-1"]').text()).toContain("重置密码");

    await wrapper.get('[data-testid="student-reset-password-1"]').trigger("click");
    expect(wrapper.get('[data-testid="student-reset-password-dialog"]').text()).toContain("系统默认密码");
    expect(wrapper.get('[data-testid="student-reset-password-dialog"]').text()).toContain("登录后必须修改密码");

    await wrapper.get('[data-testid="student-reset-password-confirm"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/students/1/reset-password",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("supports excel file import and only renders xlsx template entry", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 1, name: "一年级一班", joinCodeStatus: "active", joinCodeHint: "4721", joinCode: "4721", registrationEnabled: true },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          students: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          students: [
            { id: 2, classId: 1, studentNo: "20260031", displayName: "陈小雨" },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/students", component: StudentsView }],
    });
    await router.push("/students?classId=1");
    await router.isReady();

    const wrapper = mount(StudentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    expect(wrapper.find('[data-testid="student-import-open"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="students-import-panel"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="students-import-intro"]').exists()).toBe(false);

    expect(wrapper.find('[data-testid="student-template-csv"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-template-xlsx"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-import-input"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-import-submit"]').exists()).toBe(false);

    const file = new File(["excel-bytes"], "students.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    await wrapper.get('[data-testid="student-import-open"]').trigger("click");
    expect(wrapper.get('[data-testid="student-import-dialog"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="student-template-xlsx"]').attributes("href")).toBe("/api/students/import-template?format=xlsx");
    const fileInput = wrapper.get('[data-testid="student-import-file-input"]');
    expect(fileInput.attributes("accept")).toBe(".xlsx");
    expect(fileInput.classes()).toContain("students-page__file-input");
    Object.defineProperty(fileInput.element, "files", {
      value: [file],
      configurable: true,
    });
    await fileInput.trigger("change");
    await wrapper.get('[data-testid="student-import-file-submit"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("陈小雨");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/students/import-file",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      })
    );

    const importRequest = fetchMock.mock.calls.find(([url]) => url === "/api/students/import-file");
    const formData = importRequest?.[1]?.body;
    expect(formData).toBeInstanceOf(FormData);
    expect((formData as FormData).get("classId")).toBe("1");
    const uploadedFile = (formData as FormData).get("file");
    expect(uploadedFile).toBeInstanceOf(File);
    expect((uploadedFile as File).name).toBe("students.xlsx");
  });

  it("sorts students from table headers instead of a standalone dropdown", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        classes: [
          { id: 1, name: "一年级一班", joinCodeStatus: "active", joinCodeHint: "4721", joinCode: "4721", registrationEnabled: true },
        ],
        students: [
          { id: 1, classId: 1, studentNo: "20260001", displayName: "张小明", activatedAt: "2026-04-30T10:00:00Z" },
          { id: 2, classId: 1, studentNo: "20260002", displayName: "李小红", activatedAt: "" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/students", component: StudentsView }],
    });
    await router.push("/students?classId=1");
    await router.isReady();

    const wrapper = mount(StudentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    expect(wrapper.find('[data-testid="student-sort-select"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="student-registration-1"]').text()).toContain("已注册");
    expect(wrapper.get('[data-testid="student-registration-2"]').text()).toContain("未注册");

    await wrapper.get('[data-testid="student-sort-number"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("studentNo-desc");

    await wrapper.get('[data-testid="student-sort-number"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("studentNo-asc");

    await wrapper.get('[data-testid="student-sort-name"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("displayName-asc");

    await wrapper.get('[data-testid="student-sort-registration"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("registered-desc");

    await wrapper.get('[data-testid="student-sort-registration"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("registered-asc");
  });

  it("defaults the roster to a compact 30-student page with larger page-size options", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 1, name: "一年级一班", joinCodeStatus: "active", joinCodeHint: "4721", joinCode: "4721", registrationEnabled: true },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          students: [
            { id: 1, classId: 1, studentNo: "20260001", displayName: "张小明", activatedAt: "" },
          ],
          pagination: {
            page: 1,
            pageSize: 30,
            total: 60,
            totalPages: 2,
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/students", component: StudentsView }],
    });
    await router.push("/students?classId=1");
    await router.isReady();

    const wrapper = mount(StudentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    const pageSizeSelect = wrapper.get('[data-testid="student-page-size-select"]');
    expect(pageSizeSelect.element).toHaveProperty("value", "30");
    expect(pageSizeSelect.text()).toContain("30");
    expect(pageSizeSelect.text()).toContain("60");
    expect(pageSizeSelect.text()).toContain("100");
    expect(wrapper.get('[data-testid="student-pagination-summary"]').text()).toContain("共 60 条");
    const rosterPanelHtml = wrapper.get('[data-testid="students-roster-panel"]').html();
    expect(rosterPanelHtml.indexOf('data-testid="student-pagination-summary"')).toBeLessThan(
      rosterPanelHtml.indexOf('data-testid="students-table"'),
    );
  });

  it("filters, refreshes, and exports students by registration state", async () => {
    const createObjectURL = vi.fn(() => "blob:students");
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
            { id: 1, name: "24家具1班", joinCodeStatus: "active", joinCodeHint: "4721", joinCode: "4721", registrationEnabled: true },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          students: [
            { id: 1, classId: 1, studentNo: "20260001", displayName: "张小明", activatedAt: "2026-05-01T08:00:00Z" },
            { id: 2, classId: 1, studentNo: "20260002", displayName: "李小红", activatedAt: "" },
          ],
          pagination: { page: 1, pageSize: 30, total: 2, totalPages: 1 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          students: [
            { id: 1, classId: 1, studentNo: "20260001", displayName: "张小明", activatedAt: "2026-05-01T08:00:00Z" },
          ],
          pagination: { page: 1, pageSize: 30, total: 1, totalPages: 1 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          students: [
            { id: 3, classId: 1, studentNo: "20260003", displayName: "王小兰", activatedAt: "2026-05-02T08:00:00Z" },
          ],
          pagination: { page: 1, pageSize: 30, total: 1, totalPages: 1 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          students: [
            { id: 1, classId: 1, studentNo: "20260001", displayName: "张小明", activatedAt: "2026-05-01T08:00:00Z" },
            { id: 3, classId: 1, studentNo: "20260003", displayName: "王小兰", activatedAt: "2026-05-02T08:00:00Z" },
          ],
          pagination: { page: 1, pageSize: 100, total: 2, totalPages: 1 },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/students", component: StudentsView }],
    });
    await router.push("/students?classId=1");
    await router.isReady();

    const wrapper = mount(StudentsView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="student-registration-filter"]').text()).toContain("全部");
    expect(wrapper.get('[data-testid="student-registration-filter"]').text()).toContain("已注册");
    expect(wrapper.get('[data-testid="student-registration-filter"]').text()).toContain("未注册");
    expect(wrapper.get('[data-testid="student-export"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="student-refresh"]').exists()).toBe(true);

    await wrapper.get('[data-testid="student-registration-filter"]').setValue("registered");
    await flushPromises();

    expect(router.currentRoute.value.query.registration).toBe("registered");
    expect(wrapper.text()).toContain("张小明");
    expect(wrapper.text()).not.toContain("李小红");
    expect(fetchMock).toHaveBeenCalledWith("/api/students?classId=1&registration=registered", expect.any(Object));

    await wrapper.get('[data-testid="student-refresh"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("王小兰");
    expect(wrapper.text()).not.toContain("张小明");

    await wrapper.get('[data-testid="student-export"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith("/api/students?classId=1&registration=registered&pageSize=100", expect.any(Object));
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:students");
    expect(linkClicks).toContain("24家具1班-学生名单.xls");
  });
});

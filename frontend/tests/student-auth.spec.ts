import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import App from "@/App.vue";
import { createAppRouter } from "@/router";

describe("Student auth routes", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("activates student account and redirects to student assignments", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: "unauthorized",
            message: "未登录",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 1,
            classId: 1,
            studentNo: "20260001",
            displayName: "张小明",
            className: "一年级一班",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createAppRouter(pinia);
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router],
      },
    });

    await router.push("/student/activate");
    await router.isReady();
    await flushPromises();

    await wrapper.get('[data-testid="student-activate-join-code"]').setValue("ABCD1234");
    await wrapper.get('[data-testid="student-activate-no"]').setValue("20260001");
    await wrapper.get('[data-testid="student-activate-password"]').setValue("student123");
    await wrapper.get('[data-testid="student-activate-confirm-password"]').setValue("student123");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/student/assignments");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/student/auth/activate",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("logs in with student number and password without class registration code", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: "unauthorized",
            message: "未登录",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 1,
            classId: 1,
            studentNo: "20260001",
            displayName: "张小明",
            className: "一年级一班",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createAppRouter(pinia);
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router],
      },
    });

    await router.push("/student/login");
    await router.isReady();
    await flushPromises();

    expect(wrapper.find('[data-testid="student-login-join-code"]').exists()).toBe(false);
    await wrapper.get('[data-testid="student-login-no"]').setValue("20260001");
    await wrapper.get('[data-testid="student-login-password"]').setValue("student123");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/student/assignments");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/student/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          studentNo: "20260001",
          password: "student123",
        }),
      }),
    );
  });

  it("requires a reset-password student to change password before opening student pages", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: "unauthorized",
            message: "未登录",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 1,
            classId: 1,
            studentNo: "20260001",
            displayName: "张小明",
            className: "一年级一班",
            mustChangePassword: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 1,
            classId: 1,
            studentNo: "20260001",
            displayName: "张小明",
            className: "一年级一班",
            mustChangePassword: false,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          assignments: [],
          submissionConstraints: {
            allowedTypesLabel: "文件",
            maxFileSizeBytes: 52428800,
            maxFileSizeLabel: "50 MB",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createAppRouter(pinia);
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router],
      },
    });

    await router.push("/student/login");
    await router.isReady();
    await flushPromises();

    await wrapper.get('[data-testid="student-login-no"]').setValue("20260001");
    await wrapper.get('[data-testid="student-login-password"]').setValue("123456");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/student/change-password");
    expect(wrapper.get('[data-testid="student-change-password-panel"]').text()).toContain("请先修改初始密码");

    await wrapper.get('[data-testid="student-change-current-password"]').setValue("123456");
    await wrapper.get('[data-testid="student-change-new-password"]').setValue("654321");
    await wrapper.get('[data-testid="student-change-confirm-password"]').setValue("654321");
    await wrapper.get('[data-testid="student-change-password-submit"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="student-change-password-error"]').text()).toContain("密码过于简单");
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/student/password",
      expect.objectContaining({
        body: JSON.stringify({
          currentPassword: "123456",
          newPassword: "654321",
        }),
      }),
    );

    await wrapper.get('[data-testid="student-change-new-password"]').setValue("newpass123");
    await wrapper.get('[data-testid="student-change-confirm-password"]').setValue("newpass123");
    await wrapper.get('[data-testid="student-change-password-submit"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/student/password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          currentPassword: "123456",
          newPassword: "newpass123",
        }),
      }),
    );
    expect(router.currentRoute.value.fullPath).toBe("/student/assignments");
  });

  it("redirects restored reset-password student sessions to the password change page", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          id: 1,
          classId: 1,
          studentNo: "20260001",
          displayName: "张小明",
          className: "一年级一班",
          mustChangePassword: true,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createAppRouter(pinia);
    await router.push("/student/assignments");
    await router.isReady();
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/student/change-password");
  });

  it("redirects unauthenticated student routes to /student/login", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          code: "unauthorized",
          message: "未登录",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createAppRouter(pinia);
    await router.push("/student/assignments");
    await router.isReady();
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/student/login");
    expect(fetchMock).toHaveBeenCalledWith("/api/student/session", expect.any(Object));
  });
});

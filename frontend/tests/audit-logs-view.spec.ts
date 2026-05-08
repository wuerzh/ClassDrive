import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import AuditLogsView from "@/views/AuditLogsView.vue";

describe("AuditLogsView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows login and operation logs in compact settings tables", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          logs: [
            {
              id: 2,
              occurredAt: "2026-05-06T08:30:00Z",
              actorType: "teacher",
              actorName: "示例老师",
              username: "teacher",
              status: "success",
              ipAddress: "127.0.0.1",
              message: "登录成功",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          logs: [
            {
              id: 8,
              occurredAt: "2026-05-06T08:32:00Z",
              actorType: "teacher",
              actorName: "示例老师",
              method: "POST",
              path: "/api/classes",
              statusCode: 201,
              summary: "创建班级：日志测试班",
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mount(AuditLogsView, {
      global: {
        plugins: [createPinia()],
      },
    });
    await flushPromises();

    expect(wrapper.get('[data-testid="login-logs-table"]').text()).toContain("teacher");
    expect(wrapper.get('[data-testid="login-logs-table"]').text()).toContain("登录成功");
    expect(wrapper.get('[data-testid="operation-logs-table"]').text()).toContain("创建班级：日志测试班");
    expect(wrapper.get('[data-testid="operation-logs-table"]').text()).not.toContain("/api/classes");
    expect(wrapper.get('[data-testid="operation-logs-table"]').text()).toContain("成功");
    expect(wrapper.get('[data-testid="operation-logs-table"]').text()).not.toContain("201");
    expect(fetchMock).toHaveBeenCalledWith("/api/audit/login-logs", expect.objectContaining({ credentials: "same-origin" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/audit/operation-logs", expect.objectContaining({ credentials: "same-origin" }));
  });

  it("filters audit logs and exports the current login log view", async () => {
    const createObjectURL = vi.fn(() => "blob:audit-logs");
    const revokeObjectURL = vi.fn();
    const NativeURL = URL;
    class MockURL extends NativeURL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    }
    vi.stubGlobal("URL", MockURL);
    const linkClicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function clickDownloadLink() {
      linkClicks.push(this.download);
    });

    const fetchMock = vi.fn(async (input: string) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/audit/login-logs" && url.searchParams.get("status") === "failure") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            logs: [
              {
                id: 3,
                occurredAt: "2026-05-06T08:40:00Z",
                actorType: "teacher",
                actorName: "示例老师",
                username: "admin",
                status: "failure",
                ipAddress: "127.0.0.1",
                message: "账号或密码错误",
              },
            ],
          }),
        };
      }
      if (url.pathname === "/api/audit/operation-logs" && url.searchParams.get("method") === "POST") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            logs: [
              {
                id: 8,
                occurredAt: "2026-05-06T08:42:00Z",
                actorType: "teacher",
                actorName: "示例老师",
                method: "POST",
                path: "/api/classes",
                statusCode: 201,
                summary: "创建班级：日志测试班",
              },
            ],
          }),
        };
      }
      if (url.pathname === "/api/audit/login-logs") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            logs: [
              {
                id: 2,
                occurredAt: "2026-05-06T08:30:00Z",
                actorType: "teacher",
                actorName: "示例老师",
                username: "admin",
                status: "success",
                ipAddress: "127.0.0.1",
                message: "登录成功",
              },
            ],
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ logs: [] }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mount(AuditLogsView, {
      global: {
        plugins: [createPinia()],
      },
    });
    await flushPromises();

    await wrapper.get('[data-testid="audit-login-query"]').setValue("admin");
    await wrapper.get('[data-testid="audit-login-actor"]').setValue("teacher");
    await wrapper.get('[data-testid="audit-login-status"]').setValue("failure");
    await wrapper.get('[data-testid="audit-operation-query"]').setValue("classes");
    await wrapper.get('[data-testid="audit-operation-actor"]').setValue("teacher");
    await wrapper.get('[data-testid="audit-operation-method"]').setValue("POST");
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 140);
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="audit-logs-apply"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="audit-logs-clear-row"]').exists()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audit/login-logs?actorType=teacher&status=failure&q=admin",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audit/operation-logs?actorType=teacher&method=POST&q=classes",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(wrapper.get('[data-testid="login-logs-table"]').text()).toContain("账号或密码错误");
    expect(wrapper.get('[data-testid="operation-logs-table"]').text()).toContain("创建班级：日志测试班");
    expect(wrapper.get('[data-testid="operation-logs-table"]').text()).not.toContain("/api/classes");

    await wrapper.get('[data-testid="audit-logs-export-login"]').trigger("click");
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:audit-logs");
    expect(linkClicks).toContain("登录日志.xls");
    await wrapper.get('[data-testid="audit-logs-export-operation"]').trigger("click");
    expect(linkClicks).toContain("操作日志.xls");
  });

  it("clears login and operation logs before the selected date after confirmation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          logs: [
            {
              id: 2,
              occurredAt: "2026-04-20T08:30:00Z",
              actorType: "teacher",
              actorName: "示例老师",
              username: "admin",
              status: "success",
              ipAddress: "127.0.0.1",
              message: "登录成功",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          logs: [
            {
              id: 8,
              occurredAt: "2026-04-20T08:42:00Z",
              actorType: "teacher",
              actorName: "示例老师",
              method: "POST",
              path: "/api/classes",
              statusCode: 201,
              summary: "创建班级：日志测试班",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ deletedLoginLogs: 2, deletedOperationLogs: 3 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ logs: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ logs: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mount(AuditLogsView, {
      global: {
        plugins: [createPinia()],
      },
    });
    await flushPromises();

    await wrapper.get('[data-testid="audit-clear-before-date"]').setValue("2026-05-01");
    await wrapper.get('[data-testid="audit-logs-clear-open"]').trigger("click");
    expect(wrapper.get('[data-testid="audit-logs-clear-dialog"]').text()).toContain("2026-05-01");

    await wrapper.get('[data-testid="audit-logs-clear-confirm"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audit/logs?before=2026-05-01",
      expect.objectContaining({
        method: "DELETE",
        credentials: "same-origin",
      }),
    );
    expect(wrapper.get('[data-testid="audit-clear-feedback"]').text()).toContain("已清理 2 条登录日志、3 条操作日志");
    expect(wrapper.get('[data-testid="login-logs-table"]').text()).toContain("暂无登录日志");
    expect(wrapper.get('[data-testid="operation-logs-table"]').text()).toContain("暂无操作日志");
  });
});

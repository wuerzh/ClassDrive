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

  it("shows login and operation logs in one merged paged list", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        logs: [
          {
            id: 8,
            logType: "operation",
            occurredAt: "2026-05-06T08:32:00Z",
            actorType: "teacher",
            account: "示例老师",
            actorName: "示例老师",
            action: "创建班级：日志测试班",
            result: "成功",
            ipAddress: "10.0.0.8",
          },
          {
            id: 2,
            logType: "login",
            occurredAt: "2026-05-06T08:30:00Z",
            actorType: "teacher",
            account: "teacher",
            actorName: "示例老师",
            action: "登录成功",
            result: "成功",
            ipAddress: "127.0.0.1",
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

    const wrapper = mount(AuditLogsView, {
      global: {
        plugins: [createPinia()],
      },
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="audit-logs-tab-login"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="audit-logs-tab-operation"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="audit-logs-panel"]').text()).toContain("最近日志");
    expect(wrapper.get('[data-testid="audit-logs-table"]').text()).toContain("teacher");
    expect(wrapper.get('[data-testid="audit-logs-table"]').text()).toContain("登录成功");
    expect(wrapper.get('[data-testid="audit-logs-table"]').text()).toContain("创建班级：日志测试班");
    expect(wrapper.get('[data-testid="audit-logs-table"]').text()).toContain("10.0.0.8");
    expect(wrapper.get('[data-testid="audit-logs-table"]').text()).toContain("登录");
    expect(wrapper.get('[data-testid="audit-logs-table"]').text()).toContain("操作");
    expect(wrapper.get('[data-testid="audit-logs-table"]').text()).toContain("成功");
    expect(wrapper.get('[data-testid="audit-log-pagination-summary"]').text()).toContain("第 1 / 1 页 · 共 2 条");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/audit/logs?page=1&pageSize=8", expect.objectContaining({ credentials: "same-origin" }));
    const logTypeOptions = wrapper.findAll('[data-testid="audit-log-type"] option').map((option) => option.text());
    expect(logTypeOptions).toEqual(["全部", "登录日志", "操作日志"]);
    expect(wrapper.find('[data-testid="audit-operation-method"]').exists()).toBe(false);
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
      if (url.pathname === "/api/audit/logs" && url.searchParams.get("result") === "failure") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            logs: [
              {
                id: 3,
                logType: "login",
                occurredAt: "2026-05-06T08:40:00Z",
                actorType: "teacher",
                account: "admin",
                actorName: "示例老师",
                action: "账号或密码错误",
                result: "失败",
                ipAddress: "127.0.0.1",
              },
            ],
            pagination: {
              page: 1,
              pageSize: 8,
              total: 1,
              totalPages: 1,
            },
          }),
        };
      }
      if (url.pathname === "/api/audit/logs") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            logs: [
              {
                id: 2,
                logType: "login",
                occurredAt: "2026-05-06T08:30:00Z",
                actorType: "teacher",
                account: "admin",
                actorName: "示例老师",
                action: "登录成功",
                result: "成功",
                ipAddress: "127.0.0.1",
              },
            ],
            pagination: {
              page: 1,
              pageSize: 8,
              total: 1,
              totalPages: 1,
            },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ logs: [], pagination: { page: 1, pageSize: 8, total: 0, totalPages: 1 } }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mount(AuditLogsView, {
      global: {
        plugins: [createPinia()],
      },
    });
    await flushPromises();

    await wrapper.get('[data-testid="audit-log-query"]').setValue("admin");
    await wrapper.get('[data-testid="audit-log-actor"]').setValue("teacher");
    await wrapper.get('[data-testid="audit-log-result"]').setValue("failure");
    await wrapper.get('[data-testid="audit-log-type"]').setValue("login");
    await wrapper.get('[data-testid="audit-ip-query"]').setValue("10.0.0.8");
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 140);
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="audit-logs-apply"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="audit-logs-clear-row"]').exists()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audit/logs?logType=login&actorType=teacher&result=failure&q=admin&ip=10.0.0.8&page=1&pageSize=8",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(wrapper.get('[data-testid="audit-logs-table"]').text()).toContain("账号或密码错误");

    await wrapper.get('[data-testid="audit-logs-export"]').trigger("click");
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:audit-logs");
    expect(linkClicks).toContain("日志审计.xls");
  });

  it("clears login and operation logs before the selected date after confirmation", async () => {
    let cleared = false;
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://localhost");
      if (url.pathname === "/api/audit/logs" && init?.method === "DELETE") {
        cleared = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({ deletedLoginLogs: 2, deletedOperationLogs: 3 }),
        };
      }
      if (cleared) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ logs: [], pagination: { page: 1, pageSize: 8, total: 0, totalPages: 1 } }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          logs: [
            {
              id: 2,
              logType: "login",
              occurredAt: "2026-04-20T08:30:00Z",
              actorType: "teacher",
              account: "admin",
              actorName: "示例老师",
              action: "登录成功",
              result: "成功",
              ipAddress: "127.0.0.1",
            },
          ],
          pagination: {
            page: 1,
            pageSize: 8,
            total: 1,
            totalPages: 1,
          },
        }),
      };
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
    expect(wrapper.get('[data-testid="audit-logs-table"]').text()).toContain("暂无日志");
  });

  it("requests the next merged audit log page from the backend paginator", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      const url = new URL(input, "http://localhost");
      const page = Number(url.searchParams.get("page") ?? "1");
      const pageSize = Number(url.searchParams.get("pageSize") ?? "8");
      const rowIndex = page === 2 ? 9 : 1;
      const rows = page === 2
        ? [{
          id: rowIndex,
          logType: "operation",
          occurredAt: `2026-05-06T09:${String(rowIndex).padStart(2, "0")}:00Z`,
          actorType: "teacher",
          account: "示例老师",
          actorName: "示例老师",
          action: `操作 ${rowIndex}`,
          result: "成功",
          ipAddress: "10.0.0.8",
        }]
        : [{
          id: rowIndex,
          logType: "login",
          occurredAt: `2026-05-06T08:${String(rowIndex).padStart(2, "0")}:00Z`,
          actorType: "teacher",
          account: `login-${rowIndex}`,
          actorName: "示例老师",
          action: `登录 ${rowIndex}`,
          result: "成功",
          ipAddress: "127.0.0.1",
        }];
      return {
        ok: true,
        status: 200,
        json: async () => ({
          logs: rows,
          pagination: {
            page,
            pageSize,
            total: 9,
            totalPages: 2,
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mount(AuditLogsView, {
      global: {
        plugins: [createPinia()],
      },
    });
    await flushPromises();

    expect(wrapper.get('[data-testid="audit-logs-table"]').text()).toContain("login-1");
    expect(wrapper.get('[data-testid="audit-logs-table"]').text()).not.toContain("操作 9");
    expect(wrapper.get('[data-testid="audit-log-pagination-summary"]').text()).toContain("第 1 / 2 页 · 共 9 条");

    await wrapper.get('[data-testid="audit-log-page-next"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="audit-logs-table"]').text()).toContain("操作 9");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audit/logs?page=2&pageSize=8",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });
});

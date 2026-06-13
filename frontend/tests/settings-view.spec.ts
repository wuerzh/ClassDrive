import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import SettingsView from "@/views/SettingsView.vue";
import TeacherProfileSettingsView from "@/views/TeacherProfileSettingsView.vue";
import SystemSettingsView from "@/views/SystemSettingsView.vue";
import TeacherUsersView from "@/views/TeacherUsersView.vue";
import TeacherUserDetailView from "@/views/TeacherUserDetailView.vue";
import AuditLogsView from "@/views/AuditLogsView.vue";
import { createAppRouter } from "@/router";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";

function createSettingsRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/settings",
        component: SettingsView,
        children: [
          { path: "profile", name: "settings-profile", component: TeacherProfileSettingsView },
          { path: "system", name: "settings-system", component: SystemSettingsView, meta: { ownerOnly: true } },
          { path: "teachers", name: "settings-teachers", component: TeacherUsersView, meta: { ownerOnly: true } },
          { path: "teachers/:teacherId", name: "settings-teacher-detail", component: TeacherUserDetailView, meta: { ownerOnly: true } },
          { path: "logs", name: "settings-logs", component: AuditLogsView, meta: { ownerOnly: true } },
        ],
      },
    ],
  });
}

describe("SettingsView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  it("shows settings overview as configuration summary with owner modules", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        settings: {
          uploadPanelEnabled: true,
          serverPort: "80",
          serverHost: "192.168.1.24",
        },
      }),
    }));
    const authStore = useAuthStore();
    authStore.user = {
      id: 1,
      username: "teacher",
      displayName: "示例老师",
      role: "owner",
    };

    const router = createSettingsRouter();
    await router.push("/settings");
    await router.isReady();

    const wrapper = mount(SettingsView, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("示例老师");
    expect(wrapper.find(".classes-page__header").exists()).toBe(false);
    expect(wrapper.find('[data-testid="settings-nav-bar"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="settings-compact-nav"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="settings-account-strip"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="settings-account-identity"]').text()).toContain("当前账号：示例老师（teacher）");
    expect(wrapper.find('[data-testid="settings-entry-list"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="settings-nav-overview"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="settings-nav-profile"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="settings-nav-system"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="settings-nav-teachers"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="settings-nav-logs"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="settings-overview-grid"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="settings-account-panel"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="settings-portal-panel"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="settings-modules-panel"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="settings-route-card-profile"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="settings-route-card-system"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="settings-route-card-teachers"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="settings-route-card-logs"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="settings-usage-guide"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="settings-usage-cards"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="settings-portal-link"]').text()).toContain("http://192.168.1.24/");
    expect(wrapper.get('[data-testid="settings-portal-link"]').element.tagName).toBe("BUTTON");
    expect(wrapper.get('[data-testid="settings-portal-link"]').attributes("href")).toBeUndefined();
    expect(wrapper.text()).not.toContain("可用配置模块");
    expect(wrapper.text()).not.toContain("按角色进入对应配置");
  });

  it("copies the portal address from settings overview instead of opening it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        settings: {
          uploadPanelEnabled: true,
          singleAccountLoginEnabled: true,
          serverPort: "666",
          serverHost: "10.156.168.7",
        },
      }),
    }));
    const authStore = useAuthStore();
    const toastStore = useToastStore();
    authStore.user = {
      id: 1,
      username: "teacher",
      displayName: "示例老师",
      role: "owner",
    };

    const router = createSettingsRouter();
    await router.push("/settings");
    await router.isReady();

    const wrapper = mount(SettingsView, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    await wrapper.get('[data-testid="settings-portal-link"]').trigger("click");
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith("http://10.156.168.7:666/");
    expect(toastStore.items.at(-1)?.text).toBe("访问地址已复制");
  });

  it("falls back to selection copy when clipboard write is blocked", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard blocked"));
    const originalExecCommand = document.execCommand;
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        settings: {
          uploadPanelEnabled: true,
          singleAccountLoginEnabled: true,
          serverPort: "666",
          serverHost: "10.156.168.7",
        },
      }),
    }));
    const authStore = useAuthStore();
    const toastStore = useToastStore();
    authStore.user = {
      id: 1,
      username: "teacher",
      displayName: "示例老师",
      role: "owner",
    };

    try {
      const router = createSettingsRouter();
      await router.push("/settings");
      await router.isReady();

      const wrapper = mount(SettingsView, {
        global: {
          plugins: [router],
        },
      });
      await flushPromises();

      await wrapper.get('[data-testid="settings-portal-link"]').trigger("click");
      await flushPromises();

      expect(writeText).toHaveBeenCalledWith("http://10.156.168.7:666/");
      expect(execCommand).toHaveBeenCalledWith("copy");
      expect(toastStore.items.at(-1)?.text).toBe("访问地址已复制");
    } finally {
      if (originalExecCommand) {
        Object.defineProperty(document, "execCommand", {
          configurable: true,
          value: originalExecCommand,
        });
      } else {
        Reflect.deleteProperty(document, "execCommand");
      }
    }
  });

  it("hides system and teacher management tabs for staff", async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 2,
      username: "assistant",
      displayName: "助教老师",
      role: "staff",
    };

    const router = createSettingsRouter();
    await router.push("/settings");
    await router.isReady();

    const wrapper = mount(SettingsView, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.find('[data-testid="settings-nav-overview"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="settings-nav-profile"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="settings-nav-system"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="settings-nav-teachers"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="settings-nav-logs"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="settings-route-card-system"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="settings-route-card-teachers"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="settings-route-card-logs"]').exists()).toBe(false);
  });

  it("registers task 3 settings routes in app router", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore(pinia);
    authStore.initialized = true;
    authStore.user = {
      id: 1,
      username: "teacher",
      displayName: "示例老师",
      role: "owner",
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        profile: {
          id: 1,
          username: "teacher",
          displayName: "示例老师",
          role: "owner",
          preferences: {
            compactListEnabled: false,
          },
        },
      }),
    }));

    const router = createAppRouter(pinia);
    await router.push("/settings/profile");
    await router.isReady();
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("settings-profile");

    await router.push("/settings/system");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("settings-system");

    await router.push("/settings/teachers");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("settings-teachers");

    await router.push("/settings/logs");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("settings-logs");
  });

  it("redirects staff away from owner-only settings routes", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore(pinia);
    authStore.initialized = true;
    authStore.user = {
      id: 2,
      username: "assistant",
      displayName: "助教老师",
      role: "staff",
    };

    const router = createAppRouter(pinia);

    await router.push("/settings/system");
    await router.isReady();
    expect(router.currentRoute.value.fullPath).toBe("/settings/profile");

    await router.push("/settings/teachers/1");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/settings/profile");

    await router.push("/settings/logs");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/settings/profile");
  });

  it("edits the system access port with an immediate-effect notice", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore(pinia);
    authStore.user = {
      id: 1,
      username: "teacher",
      displayName: "示例老师",
      role: "owner",
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
            settings: {
              uploadPanelEnabled: true,
              singleAccountLoginEnabled: true,
              serverPort: "80",
              serverHost: "192.168.1.24",
            },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          settings: {
            uploadPanelEnabled: true,
            singleAccountLoginEnabled: false,
            serverPort: "777",
            serverHost: "192.168.1.24",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = mount(SystemSettingsView, {
      global: {
        plugins: [pinia],
      },
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="system-settings-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="system-settings-guide"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="system-access-url"]').text()).toContain("http://192.168.1.24/");
    expect(wrapper.get('[data-testid="system-port-note"]').text()).toContain("保存后立即生效");
    expect(wrapper.get('[data-testid="system-single-account-login"]').element).toHaveProperty("checked", true);
    await wrapper.get('[data-testid="system-port-input"]').setValue("777");
    await wrapper.get('[data-testid="system-single-account-login"]').setValue(false);
    await wrapper.get('[data-testid="system-share-expires-input"]').setValue("30");
    await wrapper.get('[data-testid="system-settings-save"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/settings/system",
      expect.objectContaining({
        method: "PATCH",
        credentials: "same-origin",
        body: JSON.stringify({
          uploadPanelEnabled: true,
          singleAccountLoginEnabled: false,
          serverPort: "777",
          defaultShareExpiresDays: 30,
        }),
      }),
    );
    expect(wrapper.get('[data-testid="system-access-url"]').text()).toContain("http://192.168.1.24:777/");
  });
});

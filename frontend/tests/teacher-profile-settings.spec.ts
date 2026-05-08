import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import TeacherProfileSettingsView from "@/views/TeacherProfileSettingsView.vue";
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

describe("TeacherProfileSettingsView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  it("loads and updates teacher display name while compact list stays default", async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 1,
      username: "teacher",
      displayName: "示例老师",
      role: "owner",
    };

    const fetchMock = mockJsonSequence([
      {
        profile: {
          id: 1,
          username: "teacher",
          displayName: "示例老师",
          role: "owner",
          preferences: {
            compactListEnabled: false,
          },
        },
      },
      {
        profile: {
          id: 1,
          username: "teacher",
          displayName: "王老师",
          role: "owner",
          preferences: {
            compactListEnabled: true,
          },
        },
      },
    ]);

    const wrapper = mount(TeacherProfileSettingsView);
    await flushPromises();

    expect(wrapper.find('[data-testid="profile-base-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="profile-password-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="profile-base-guide"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="profile-password-guide"]').exists()).toBe(true);
    expect((wrapper.get('[data-testid="profile-display-name"]').element as HTMLInputElement).value).toBe("示例老师");
    expect(wrapper.find('[data-testid="profile-default-note"]').exists()).toBe(false);

    await wrapper.get('[data-testid="profile-display-name"]').setValue("王老师");
    await wrapper.get('[data-testid="profile-save"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/settings/profile",
      expect.objectContaining({
        method: "PATCH",
        credentials: "same-origin",
        body: JSON.stringify({
          displayName: "王老师",
          preferences: {
            compactListEnabled: true,
          },
        }),
      }),
    );
    expect(authStore.user?.displayName).toBe("王老师");
  });

  it("submits password change separately", async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 1,
      username: "teacher",
      displayName: "示例老师",
      role: "owner",
    };

    const fetchMock = mockJsonSequence([
      {
        profile: {
          id: 1,
          username: "teacher",
          displayName: "示例老师",
          role: "owner",
          preferences: {
            compactListEnabled: false,
          },
        },
      },
      { ok: true },
    ]);

    const wrapper = mount(TeacherProfileSettingsView);
    await flushPromises();

    expect(wrapper.find('[data-testid="profile-password-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="profile-password-guide"]').exists()).toBe(true);
    await wrapper.get('[data-testid="password-current"]').setValue("demo123");
    await wrapper.get('[data-testid="password-next"]').setValue("newpass123");
    await wrapper.get('[data-testid="password-confirm"]').setValue("newpass123");
    await wrapper.get('[data-testid="password-save"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/settings/password",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({
          currentPassword: "demo123",
          newPassword: "newpass123",
        }),
      }),
    );
  });

  it("requires password confirmation before submitting a password change", async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 1,
      username: "teacher",
      displayName: "示例老师",
      role: "owner",
    };

    const fetchMock = mockJsonSequence([
      {
        profile: {
          id: 1,
          username: "teacher",
          displayName: "示例老师",
          role: "owner",
          preferences: {
            compactListEnabled: false,
          },
        },
      },
    ]);

    const wrapper = mount(TeacherProfileSettingsView);
    await flushPromises();

    await wrapper.get('[data-testid="password-current"]').setValue("demo123");
    await wrapper.get('[data-testid="password-next"]').setValue("newpass123");
    await wrapper.get('[data-testid="password-confirm"]').setValue("newpass124");
    await wrapper.get('[data-testid="password-save"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid="password-confirm-error"]').text()).toContain("两次输入的新密码不一致");
  });

  it("rejects trivial passwords before submitting a password change", async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 1,
      username: "teacher",
      displayName: "示例老师",
      role: "owner",
    };

    const fetchMock = mockJsonSequence([
      {
        profile: {
          id: 1,
          username: "teacher",
          displayName: "示例老师",
          role: "owner",
          preferences: {
            compactListEnabled: false,
          },
        },
      },
    ]);

    const wrapper = mount(TeacherProfileSettingsView);
    await flushPromises();

    await wrapper.get('[data-testid="password-current"]').setValue("demo123");
    await wrapper.get('[data-testid="password-next"]').setValue("123456");
    await wrapper.get('[data-testid="password-confirm"]').setValue("123456");
    await wrapper.get('[data-testid="password-save"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid="password-confirm-error"]').text()).toContain("密码过于简单");
  });
});

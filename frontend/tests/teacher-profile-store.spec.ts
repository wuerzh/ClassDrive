import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { api } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { useTeacherProfileStore } from "@/stores/teacher-profile";

describe("teacher profile store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("loads profile and syncs auth display name", async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 1,
      username: "teacher",
      displayName: "旧名字",
      role: "staff",
    };
    const teacherProfileStore = useTeacherProfileStore();
    vi.spyOn(api, "profileSettings").mockResolvedValue({
      profile: {
        id: 1,
        username: "teacher",
        displayName: "新名字",
        role: "owner",
        preferences: {
          compactListEnabled: true,
        },
      },
    });

    await expect(teacherProfileStore.load()).resolves.toEqual({
      id: 1,
      username: "teacher",
      displayName: "新名字",
      role: "owner",
      preferences: {
        compactListEnabled: true,
      },
    });

    expect(authStore.user?.displayName).toBe("新名字");
    expect(authStore.user?.role).toBe("owner");
  });

  it("saves profile changes and clears local state", async () => {
    const authStore = useAuthStore();
    authStore.user = {
      id: 1,
      username: "teacher",
      displayName: "示例老师",
      role: "owner",
    };
    const teacherProfileStore = useTeacherProfileStore();
    vi.spyOn(api, "updateProfileSettings").mockResolvedValue({
      profile: {
        id: 1,
        username: "teacher",
        displayName: "王老师",
        role: "owner",
        preferences: {
          compactListEnabled: false,
        },
      },
    });

    await expect(
      teacherProfileStore.save({
        displayName: "王老师",
        preferences: { compactListEnabled: false },
      }),
    ).resolves.toEqual({
      id: 1,
      username: "teacher",
      displayName: "王老师",
      role: "owner",
      preferences: {
        compactListEnabled: false,
      },
    });

    teacherProfileStore.clear();
    expect(teacherProfileStore.profile).toBeNull();
  });
});

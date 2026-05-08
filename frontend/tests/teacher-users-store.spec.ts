import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { api } from "@/api/client";
import { useTeacherUsersStore } from "@/stores/teacher-users";

describe("teacher users store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("loads teacher list and reuses cached data", async () => {
    const teacherUsersStore = useTeacherUsersStore();
    const teachersSpy = vi.spyOn(api, "teachers").mockResolvedValue({
      teachers: [
        { id: 1, username: "teacher", displayName: "示例老师", role: "owner", disabled: false },
      ],
    });

    await expect(teacherUsersStore.load()).resolves.toEqual([
      { id: 1, username: "teacher", displayName: "示例老师", role: "owner", disabled: false },
    ]);
    await teacherUsersStore.load();

    expect(teachersSpy).toHaveBeenCalledTimes(1);
  });

  it("creates, loads detail and saves teacher updates", async () => {
    const teacherUsersStore = useTeacherUsersStore();
    vi.spyOn(api, "createTeacher").mockResolvedValue({
      teacher: { id: 2, username: "math", displayName: "数学老师", role: "staff", disabled: false },
    });
    vi.spyOn(api, "teacher").mockResolvedValue({
      teacher: { id: 2, username: "math", displayName: "数学老师", role: "staff", disabled: false },
    });
    vi.spyOn(api, "updateTeacher").mockResolvedValue({
      teacher: { id: 2, username: "math", displayName: "数学组老师", role: "owner", disabled: true },
    });

    await expect(
      teacherUsersStore.create({
        username: "math",
        displayName: "数学老师",
        password: "math12345",
        role: "staff",
      }),
    ).resolves.toEqual({
      id: 2,
      username: "math",
      displayName: "数学老师",
      role: "staff",
      disabled: false,
    });

    await expect(teacherUsersStore.loadTeacher(2, true)).resolves.toEqual({
      id: 2,
      username: "math",
      displayName: "数学老师",
      role: "staff",
      disabled: false,
    });

    await expect(
      teacherUsersStore.saveTeacher(2, {
        displayName: "数学组老师",
        role: "owner",
        disabled: true,
      }),
    ).resolves.toEqual({
      id: 2,
      username: "math",
      displayName: "数学组老师",
      role: "owner",
      disabled: true,
    });

    expect(teacherUsersStore.teachers).toContainEqual({
      id: 2,
      username: "math",
      displayName: "数学组老师",
      role: "owner",
      disabled: true,
    });
  });
});

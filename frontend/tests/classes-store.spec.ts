import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { api } from "@/api/client";
import { useClassesStore } from "@/stores/classes";

describe("classes store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("loads classes, refreshes join code, and toggles registration", async () => {
    const classesStore = useClassesStore();
    vi.spyOn(api, "classes").mockResolvedValue({
      classes: [{ id: 1, name: "一年级一班", joinCode: "", joinCodeStatus: "inactive", joinCodeHint: "", registrationEnabled: false }],
    });
    vi.spyOn(api, "refreshClassJoinCode").mockResolvedValue({
      joinCode: "4721",
      joinCodeHint: "4721",
      joinCodeStatus: "active",
      registrationEnabled: true,
    });
    vi.spyOn(api, "updateClassRegistration").mockResolvedValue({
      classId: 1,
      joinCode: "4721",
      joinCodeHint: "4721",
      joinCodeStatus: "inactive",
      registrationEnabled: false,
    });

    await expect(classesStore.load()).resolves.toEqual([
      { id: 1, name: "一年级一班", joinCode: "", joinCodeStatus: "inactive", joinCodeHint: "", registrationEnabled: false },
    ]);

    await classesStore.refreshJoinCode(1);
    expect(classesStore.classes[0]).toEqual({
      id: 1,
      name: "一年级一班",
      joinCode: "4721",
      joinCodeStatus: "active",
      joinCodeHint: "4721",
      registrationEnabled: true,
    });

    await classesStore.updateRegistration(1, false);
    expect(classesStore.classes[0]).toEqual({
      id: 1,
      name: "一年级一班",
      joinCode: "4721",
      joinCodeStatus: "inactive",
      joinCodeHint: "4721",
      registrationEnabled: false,
    });
  });

  it("creates a class and clears local state", async () => {
    const classesStore = useClassesStore();
    vi.spyOn(api, "createClass").mockResolvedValue({
      id: 2,
      name: "二年级一班",
      joinCode: "",
      joinCodeStatus: "inactive",
      joinCodeHint: "",
      registrationEnabled: false,
    });

    await expect(classesStore.create("二年级一班")).resolves.toEqual({
      id: 2,
      name: "二年级一班",
      joinCode: "",
      joinCodeStatus: "inactive",
      joinCodeHint: "",
      registrationEnabled: false,
    });
    expect(classesStore.classes).toContainEqual({
      id: 2,
      name: "二年级一班",
      joinCode: "",
      joinCodeStatus: "inactive",
      joinCodeHint: "",
      registrationEnabled: false,
    });

    classesStore.clear();
    expect(classesStore.classes).toEqual([]);
  });
});

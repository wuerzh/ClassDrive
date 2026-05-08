import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { api } from "@/api/client";
import { useStudentsStore } from "@/stores/students";

describe("students store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("loads students by class and caches the list", async () => {
    const studentsStore = useStudentsStore();
    const studentsSpy = vi.spyOn(api, "students").mockResolvedValue({
      students: [{ id: 1, classId: 1, studentNo: "20260001", displayName: "张小明", activatedAt: "" }],
    });

    await expect(studentsStore.load(1)).resolves.toEqual([
      { id: 1, classId: 1, studentNo: "20260001", displayName: "张小明", activatedAt: "" },
    ]);
    await studentsStore.load(1);

    expect(studentsSpy).toHaveBeenCalledTimes(1);
    expect(studentsStore.listForClass(1)).toEqual([
      { id: 1, classId: 1, studentNo: "20260001", displayName: "张小明", activatedAt: "" },
    ]);
  });

  it("creates, updates, deletes and imports students from excel file", async () => {
    const studentsStore = useStudentsStore();
    studentsStore.setClassStudents(1, [{ id: 1, classId: 1, studentNo: "20260001", displayName: "张小明", activatedAt: "" }]);
    vi.spyOn(api, "createStudent").mockResolvedValue({
      id: 2,
      classId: 1,
      studentNo: "20260002",
      displayName: "李小红",
      activatedAt: "",
    });
    vi.spyOn(api, "updateStudent").mockResolvedValue({
      id: 1,
      classId: 1,
      studentNo: "20260011",
      displayName: "张小明-更新",
      activatedAt: "",
    });
    vi.spyOn(api, "deleteStudent").mockResolvedValue({ ok: true });
    vi.spyOn(api, "importStudentsFile").mockResolvedValue({
      students: [{ id: 3, classId: 1, studentNo: "20260022", displayName: "赵小雪", activatedAt: "" }],
    });

    await studentsStore.create({ classId: 1, studentNo: "20260002", displayName: "李小红" });
    await studentsStore.update(1, { classId: 1, studentNo: "20260011", displayName: "张小明-更新" });
    await studentsStore.remove(2, 1);
    await studentsStore.importFile({
      classId: 1,
      file: new File(["excel-bytes"], "students.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    });

    expect(studentsStore.listForClass(1)).toEqual([
      { id: 1, classId: 1, studentNo: "20260011", displayName: "张小明-更新", activatedAt: "" },
      { id: 3, classId: 1, studentNo: "20260022", displayName: "赵小雪", activatedAt: "" },
    ]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { api } from "@/api/client";
import { useAssignmentsStore } from "@/stores/assignments";

describe("assignments store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("loads assignments by class and caches them", async () => {
    const assignmentsStore = useAssignmentsStore();
    const assignmentsSpy = vi.spyOn(api, "assignments").mockResolvedValue({
      assignments: [
        {
          id: 1,
          classId: 2,
          title: "第一单元口算练习",
          description: "完成第 12 页题目",
          dueAt: "2026-04-25T12:00:00Z",
          status: "draft",
          submissionMode: "any",
          minFileCount: 1,
          createdAt: "2026-04-23T08:00:00Z",
          updatedAt: "2026-04-23T08:00:00Z",
        },
      ],
    });

    await expect(assignmentsStore.load(2)).resolves.toEqual([
      {
        id: 1,
        classId: 2,
        title: "第一单元口算练习",
        description: "完成第 12 页题目",
        dueAt: "2026-04-25T12:00:00Z",
        status: "draft",
        submissionMode: "any",
        minFileCount: 1,
        createdAt: "2026-04-23T08:00:00Z",
        updatedAt: "2026-04-23T08:00:00Z",
      },
    ]);
    await assignmentsStore.load(2);

    expect(assignmentsSpy).toHaveBeenCalledTimes(1);
  });

  it("creates assignment and prepends it to the class list", async () => {
    const assignmentsStore = useAssignmentsStore();
    assignmentsStore.setClassAssignments(1, [
      {
        id: 1,
        classId: 1,
        title: "旧作业",
        description: "",
        dueAt: "",
        status: "draft",
        submissionMode: "any",
        minFileCount: 1,
        createdAt: "2026-04-23T08:00:00Z",
        updatedAt: "2026-04-23T08:00:00Z",
      },
    ]);
    vi.spyOn(api, "createAssignment").mockResolvedValue({
      id: 2,
      classId: 1,
      title: "新作业",
      description: "本周五前完成",
      dueAt: "2026-04-26T12:00:00Z",
      status: "published",
      submissionMode: "folder",
      minFileCount: 5,
      createdAt: "2026-04-23T09:00:00Z",
      updatedAt: "2026-04-23T09:00:00Z",
    });

    await assignmentsStore.create({
      classId: 1,
      title: "新作业",
      description: "本周五前完成",
      dueAt: "2026-04-26T12:00:00Z",
      status: "published",
      submissionMode: "folder",
      minFileCount: 5,
    });

    expect(assignmentsStore.listForClass(1)).toEqual([
      {
        id: 2,
        classId: 1,
        title: "新作业",
        description: "本周五前完成",
        dueAt: "2026-04-26T12:00:00Z",
        status: "published",
        submissionMode: "folder",
        minFileCount: 5,
        createdAt: "2026-04-23T09:00:00Z",
        updatedAt: "2026-04-23T09:00:00Z",
      },
      {
        id: 1,
        classId: 1,
        title: "旧作业",
        description: "",
        dueAt: "",
        status: "draft",
        submissionMode: "any",
        minFileCount: 1,
        createdAt: "2026-04-23T08:00:00Z",
        updatedAt: "2026-04-23T08:00:00Z",
      },
    ]);
  });
});

import { defineStore } from "pinia";
import { api, type AssignmentItem, type AssignmentSubmissionTypeCategory } from "@/api/client";

type AssignmentsByClass = Record<number, AssignmentItem[]>;

function cloneAssignment(item: AssignmentItem): AssignmentItem {
  const cloned: AssignmentItem = {
    id: item.id,
    classId: item.classId,
    title: item.title,
    description: item.description,
    dueAt: item.dueAt,
    status: item.status,
    submissionMode: item.submissionMode,
    minFileCount: item.minFileCount,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
  if (item.submissionTypeCategory) {
    cloned.submissionTypeCategory = item.submissionTypeCategory;
  }
  return cloned;
}

export const useAssignmentsStore = defineStore("assignments", {
  state: () => ({
    assignmentsByClass: {} as AssignmentsByClass,
    loadingClassId: null as number | null,
  }),
  getters: {
    listForClass: (state) => {
      return (classId: number | null) => {
        if (!classId) {
          return [];
        }
        return state.assignmentsByClass[classId] ?? [];
      };
    },
  },
  actions: {
    clear() {
      this.assignmentsByClass = {};
      this.loadingClassId = null;
    },
    setClassAssignments(classId: number, assignments: AssignmentItem[]) {
      this.assignmentsByClass[classId] = assignments.map(cloneAssignment);
    },
    async load(classId: number, force = false) {
      if (!force && this.assignmentsByClass[classId]) {
        return this.assignmentsByClass[classId];
      }
      this.loadingClassId = classId;
      try {
        const response = await api.assignments(classId);
        this.setClassAssignments(classId, response.assignments ?? []);
        return this.assignmentsByClass[classId];
      } finally {
        this.loadingClassId = null;
      }
    },
    async create(payload: {
      classId: number;
      title: string;
      description: string;
      dueAt: string;
      status: "draft" | "published";
      submissionMode: AssignmentItem["submissionMode"];
      submissionTypeCategory: AssignmentSubmissionTypeCategory;
      minFileCount: number;
    }) {
      const created = await api.createAssignment(payload);
      const current = this.assignmentsByClass[payload.classId] ?? [];
      this.assignmentsByClass[payload.classId] = [cloneAssignment(created), ...current];
      return created;
    },
  },
});

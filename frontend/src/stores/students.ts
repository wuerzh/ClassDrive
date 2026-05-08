import { defineStore } from "pinia";
import { api, type StudentItem } from "@/api/client";

type StudentsByClass = Record<number, StudentItem[]>;

function cloneStudent(student: StudentItem): StudentItem {
  return {
    id: student.id,
    classId: student.classId,
    studentNo: student.studentNo,
    displayName: student.displayName,
    activatedAt: student.activatedAt || "",
  };
}

export const useStudentsStore = defineStore("students", {
  state: () => ({
    studentsByClass: {} as StudentsByClass,
    loadingClassId: null as number | null,
  }),
  getters: {
    listForClass: (state) => {
      return (classId: number | null) => {
        if (!classId) {
          return [];
        }
        return state.studentsByClass[classId] ?? [];
      };
    },
  },
  actions: {
    clear() {
      this.studentsByClass = {};
      this.loadingClassId = null;
    },
    setClassStudents(classId: number, students: StudentItem[]) {
      this.studentsByClass[classId] = students.map(cloneStudent);
    },
    async load(classId: number, force = false) {
      if (!force && this.studentsByClass[classId]) {
        return this.studentsByClass[classId];
      }
      this.loadingClassId = classId;
      try {
        const response = await api.students(classId);
        this.setClassStudents(classId, response.students ?? []);
        return this.studentsByClass[classId];
      } finally {
        this.loadingClassId = null;
      }
    },
    async create(payload: { classId: number; studentNo: string; displayName: string }) {
      const created = await api.createStudent(payload);
      const current = this.studentsByClass[payload.classId] ?? [];
      this.studentsByClass[payload.classId] = [...current, cloneStudent(created)];
      return created;
    },
    async update(studentId: number, payload: { classId: number; studentNo: string; displayName: string }) {
      const updated = await api.updateStudent(studentId, {
        studentNo: payload.studentNo,
        displayName: payload.displayName,
      });
      const current = this.studentsByClass[payload.classId] ?? [];
      this.studentsByClass[payload.classId] = current.map((item) => (item.id === studentId ? cloneStudent(updated) : item));
      return updated;
    },
    async remove(studentId: number, classId: number) {
      await api.deleteStudent(studentId);
      const current = this.studentsByClass[classId] ?? [];
      this.studentsByClass[classId] = current.filter((item) => item.id !== studentId);
    },
    async resetPassword(studentId: number, classId: number) {
      const response = await api.resetStudentPassword(studentId);
      const current = this.studentsByClass[classId] ?? [];
      this.studentsByClass[classId] = current.map((item) => (item.id === studentId ? cloneStudent(response.student) : item));
      return response;
    },
    async importFile(payload: { classId: number; file: File }) {
      const response = await api.importStudentsFile(payload);
      const current = this.studentsByClass[payload.classId] ?? [];
      const imported = (response.students ?? []).map(cloneStudent);
      this.studentsByClass[payload.classId] = [...current, ...imported];
      return imported;
    },
  },
});

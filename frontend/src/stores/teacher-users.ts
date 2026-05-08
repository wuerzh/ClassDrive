import { defineStore } from "pinia";
import { api, type TeacherUser } from "@/api/client";

function cloneTeacherUser(teacher: TeacherUser): TeacherUser {
  return {
    id: teacher.id,
    username: teacher.username,
    displayName: teacher.displayName,
    role: teacher.role,
    disabled: teacher.disabled,
  };
}

export const useTeacherUsersStore = defineStore("teacher-users", {
  state: () => ({
    teachers: [] as TeacherUser[],
    currentTeacher: null as TeacherUser | null,
    loading: false,
  }),
  actions: {
    clear() {
      this.teachers = [];
      this.currentTeacher = null;
      this.loading = false;
    },
    applyTeachers(teachers: TeacherUser[]) {
      this.teachers = teachers.map(cloneTeacherUser);
    },
    applyTeacher(teacher: TeacherUser) {
      const nextTeacher = cloneTeacherUser(teacher);
      this.currentTeacher = nextTeacher;
      const index = this.teachers.findIndex((item) => item.id === nextTeacher.id);
      if (index >= 0) {
        this.teachers.splice(index, 1, nextTeacher);
        return;
      }
      this.teachers = [...this.teachers, nextTeacher];
    },
    async load(force = false) {
      if (this.teachers.length > 0 && !force) {
        return this.teachers;
      }
      this.loading = true;
      try {
        const response = await api.teachers();
        this.applyTeachers(response.teachers);
        return this.teachers;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: { username: string; displayName: string; password: string; role: "owner" | "staff" }) {
      const response = await api.createTeacher(payload);
      this.applyTeacher(response.teacher);
      return this.currentTeacher;
    },
    async loadTeacher(teacherId: number, force = false) {
      if (!force && this.currentTeacher?.id === teacherId) {
        return this.currentTeacher;
      }
      const existing = this.teachers.find((item) => item.id === teacherId);
      if (existing && !force) {
        this.currentTeacher = cloneTeacherUser(existing);
        return this.currentTeacher;
      }
      const response = await api.teacher(teacherId);
      this.applyTeacher(response.teacher);
      return this.currentTeacher;
    },
    async saveTeacher(
      teacherId: number,
      payload: Partial<Pick<TeacherUser, "displayName" | "role" | "disabled">> & { password?: string },
    ) {
      const response = await api.updateTeacher(teacherId, payload);
      this.applyTeacher(response.teacher);
      return this.currentTeacher;
    },
  },
});

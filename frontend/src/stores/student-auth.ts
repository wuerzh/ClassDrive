import type { Pinia } from "pinia";
import { defineStore } from "pinia";
import { api, ApiError, type StudentSessionUser } from "@/api/client";

export const useStudentAuthStore = defineStore("student-auth", {
  state: () => ({
    user: null as StudentSessionUser | null,
    initialized: false,
  }),
  actions: {
    async restoreSession() {
      try {
        const response = await api.studentSession();
        this.user = response.user;
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }
        this.user = null;
      } finally {
        this.initialized = true;
      }
    },
    async activate(joinCode: string, studentNo: string, password: string) {
      const response = await api.studentActivate(joinCode, studentNo, password);
      this.user = response.user;
      this.initialized = true;
    },
    async login(studentNo: string, password: string) {
      const response = await api.studentLogin(studentNo, password);
      this.user = response.user;
      this.initialized = true;
    },
    async changePassword(currentPassword: string, newPassword: string) {
      const response = await api.changeStudentPassword({ currentPassword, newPassword });
      this.user = response.user;
      this.initialized = true;
    },
    async logout() {
      await api.studentLogout();
      this.user = null;
      this.initialized = true;
    },
  },
});

export function useStudentAuthStoreFor(pinia?: Pinia) {
  return useStudentAuthStore(pinia);
}

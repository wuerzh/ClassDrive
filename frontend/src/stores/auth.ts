import type { Pinia } from "pinia";
import { defineStore } from "pinia";
import { api, ApiError, type SessionUser } from "@/api/client";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as SessionUser | null,
    initialized: false,
  }),
  actions: {
    async restoreSession() {
      try {
        const response = await api.session();
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
    async login(username: string, password: string) {
      const response = await api.login(username, password);
      this.user = response.user;
      this.initialized = true;
    },
    async logout() {
      await api.logout();
      this.user = null;
      this.initialized = true;
    },
    syncUserProfile(profile: Pick<SessionUser, "displayName" | "role">) {
      if (!this.user) {
        return;
      }
      this.user = {
        ...this.user,
        displayName: profile.displayName,
        role: profile.role,
      };
    },
  },
});

export function useAuthStoreFor(pinia?: Pinia) {
  return useAuthStore(pinia);
}

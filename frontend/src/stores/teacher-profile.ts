import { defineStore } from "pinia";
import { api, type TeacherProfile, type TeacherProfilePreferences } from "@/api/client";
import { useAuthStore } from "@/stores/auth";

function clonePreferences(preferences: TeacherProfilePreferences): TeacherProfilePreferences {
  return {
    compactListEnabled: preferences.compactListEnabled,
  };
}

function cloneProfile(profile: TeacherProfile): TeacherProfile {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    role: profile.role,
    preferences: clonePreferences(profile.preferences),
  };
}

export const useTeacherProfileStore = defineStore("teacher-profile", {
  state: () => ({
    profile: null as TeacherProfile | null,
    loading: false,
  }),
  actions: {
    clear() {
      this.profile = null;
      this.loading = false;
    },
    apply(profile: TeacherProfile) {
      this.profile = cloneProfile(profile);
      const authStore = useAuthStore();
      authStore.syncUserProfile({
        displayName: profile.displayName,
        role: profile.role,
      });
    },
    async load(force = false) {
      if (this.profile && !force) {
        return this.profile;
      }
      this.loading = true;
      try {
        const response = await api.profileSettings();
        this.apply(response.profile);
        return this.profile;
      } finally {
        this.loading = false;
      }
    },
    async save(payload: { displayName: string; preferences: TeacherProfilePreferences }) {
      const response = await api.updateProfileSettings(payload);
      this.apply(response.profile);
      return this.profile;
    },
    async updatePassword(payload: { currentPassword: string; newPassword: string }) {
      await api.updatePassword(payload);
    },
  },
});

import { defineStore } from "pinia";
import { api, type SystemSettings } from "@/api/client";

type SystemSettingsInput = Pick<SystemSettings, "uploadPanelEnabled"> & Partial<Pick<SystemSettings, "singleAccountLoginEnabled" | "serverPort" | "serverHost">>;

function cloneSystemSettings(settings: SystemSettingsInput): SystemSettings {
  return {
    uploadPanelEnabled: settings.uploadPanelEnabled,
    singleAccountLoginEnabled: settings.singleAccountLoginEnabled ?? true,
    serverPort: settings.serverPort ?? "80",
    serverHost: settings.serverHost ?? "",
  };
}

export const useSystemSettingsStore = defineStore("system-settings", {
  state: () => ({
    settings: null as SystemSettings | null,
    loading: false,
  }),
  actions: {
    clear() {
      this.settings = null;
      this.loading = false;
    },
    apply(settings: SystemSettingsInput) {
      this.settings = cloneSystemSettings(settings);
    },
    async load(force = false) {
      if (this.settings && !force) {
        return this.settings;
      }
      this.loading = true;
      try {
        const response = await api.systemSettings();
        this.apply(response.settings);
        return this.settings;
      } finally {
        this.loading = false;
      }
    },
    async save(payload: Pick<SystemSettings, "uploadPanelEnabled" | "singleAccountLoginEnabled" | "serverPort">) {
      const response = await api.updateSystemSettings(payload);
      this.apply(response.settings);
      return this.settings;
    },
  },
});

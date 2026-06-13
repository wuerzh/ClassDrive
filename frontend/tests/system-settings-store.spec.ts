import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { api } from "@/api/client";
import { useSystemSettingsStore } from "@/stores/system-settings";

describe("system settings store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("loads and caches settings", async () => {
    const systemSettingsStore = useSystemSettingsStore();
    const systemSettingsSpy = vi.spyOn(api, "systemSettings").mockResolvedValue({
        settings: {
          uploadPanelEnabled: true,
          singleAccountLoginEnabled: true,
          serverPort: "80",
          serverHost: "192.168.1.24",
          defaultShareExpiresDays: 14,
        },
    });

    await expect(systemSettingsStore.load()).resolves.toEqual({
      uploadPanelEnabled: true,
      singleAccountLoginEnabled: true,
      serverPort: "80",
      serverHost: "192.168.1.24",
      defaultShareExpiresDays: 14,
    });
    await expect(systemSettingsStore.load()).resolves.toEqual({
      uploadPanelEnabled: true,
      singleAccountLoginEnabled: true,
      serverPort: "80",
      serverHost: "192.168.1.24",
      defaultShareExpiresDays: 14,
    });

    expect(systemSettingsSpy).toHaveBeenCalledTimes(1);
  });

  it("applies and clears settings locally", () => {
    const systemSettingsStore = useSystemSettingsStore();

    systemSettingsStore.apply({
      uploadPanelEnabled: false,
      singleAccountLoginEnabled: false,
      serverPort: "777",
      serverHost: "192.168.1.24",
      defaultShareExpiresDays: 30,
    });
    expect(systemSettingsStore.settings).toEqual({
      uploadPanelEnabled: false,
      singleAccountLoginEnabled: false,
      serverPort: "777",
      serverHost: "192.168.1.24",
      defaultShareExpiresDays: 30,
    });

    systemSettingsStore.clear();
    expect(systemSettingsStore.settings).toBeNull();

    systemSettingsStore.apply({
      uploadPanelEnabled: true,
    });
    expect(systemSettingsStore.settings?.serverPort).toBe("80");
    expect(systemSettingsStore.settings?.defaultShareExpiresDays).toBe(7);
  });

  it("saves system access port settings", async () => {
    const systemSettingsStore = useSystemSettingsStore();
    const updateSpy = vi.spyOn(api, "updateSystemSettings").mockResolvedValue({
        settings: {
          uploadPanelEnabled: true,
          singleAccountLoginEnabled: false,
          serverPort: "777",
          serverHost: "192.168.1.24",
          defaultShareExpiresDays: 21,
        },
    });

    await expect(systemSettingsStore.save({
      uploadPanelEnabled: true,
      singleAccountLoginEnabled: false,
      serverPort: "777",
      defaultShareExpiresDays: 21,
    })).resolves.toEqual({
      uploadPanelEnabled: true,
      singleAccountLoginEnabled: false,
      serverPort: "777",
      serverHost: "192.168.1.24",
      defaultShareExpiresDays: 21,
    });

    expect(updateSpy).toHaveBeenCalledWith({
      uploadPanelEnabled: true,
      singleAccountLoginEnabled: false,
      serverPort: "777",
      defaultShareExpiresDays: 21,
    });
  });
});

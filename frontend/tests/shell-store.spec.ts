import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { ApiError, api } from "@/api/client";
import { useShellStore } from "@/stores/shell";

describe("shell store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("keeps default navigation and marks ready when shell loading fails", async () => {
    const shellStore = useShellStore();
    vi.spyOn(api, "shell").mockRejectedValue(new ApiError(500, "server_error", "服务暂不可用"));

    await expect(shellStore.load()).resolves.toBeUndefined();

    expect(shellStore.ready).toBe(true);
    expect(shellStore.navGroups.flatMap((group) => group.items.map((item) => item.key))).toEqual([
      "library",
      "public",
      "classes-files",
      "classes",
      "assignments",
      "settings",
    ]);
  });
});

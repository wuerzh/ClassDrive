import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { api } from "@/api/client";
import { useRecentCopyTargetsStore } from "@/stores/recent-copy-targets";

describe("recent copy targets store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("loads and normalizes recent targets", async () => {
    const recentCopyTargetsStore = useRecentCopyTargetsStore();
    vi.spyOn(api, "recentCopyTargets").mockResolvedValue({
      items: [
        { space: "public", path: "/", label: "根目录", pinned: false },
        { space: "library", path: "/课件", label: "课件", pinned: true },
      ],
    });

    await expect(recentCopyTargetsStore.load()).resolves.toEqual([
      { space: "library", classId: null, path: "/课件", label: "课件", pinned: true },
      { space: "public", classId: null, path: "/", label: "根目录", pinned: false },
    ]);
    expect(recentCopyTargetsStore.pinnedCount).toBe(1);
  });

  it("remembers, pins and clears unpinned targets", async () => {
    const recentCopyTargetsStore = useRecentCopyTargetsStore();
    const saveRecentCopyTargetsSpy = vi.spyOn(api, "saveRecentCopyTargets").mockResolvedValue({ items: [] });

    await recentCopyTargetsStore.remember({
      space: "public",
      classId: null,
      path: "/资料",
      label: "资料",
    });
    expect(recentCopyTargetsStore.items[0]).toEqual({
      space: "public",
      classId: null,
      path: "/资料",
      label: "资料",
      pinned: false,
    });

    await recentCopyTargetsStore.togglePinned(0);
    expect(recentCopyTargetsStore.items[0]?.pinned).toBe(true);

    await recentCopyTargetsStore.clearUnpinned();
    expect(recentCopyTargetsStore.items).toEqual([
      {
        space: "public",
        classId: null,
        path: "/资料",
        label: "资料",
        pinned: true,
      },
    ]);
    expect(saveRecentCopyTargetsSpy).toHaveBeenCalled();
  });
});

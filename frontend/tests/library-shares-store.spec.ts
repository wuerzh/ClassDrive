import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { api, type LibraryShareItem } from "@/api/client";
import { useLibrarySharesStore } from "@/stores/library-shares";

function makeShare(overrides: Partial<LibraryShareItem> = {}): LibraryShareItem {
  return {
    id: 1,
    token: "tok-1",
    entryId: 10,
    entryName: "资料.txt",
    entryKind: "file",
    permission: "view",
    requiresAccessCode: true,
    expiresAt: "",
    disabled: false,
    status: "active",
    accessCount: 0,
    createdByName: "示例老师",
    createdAt: "2026-06-12T00:00:00Z",
    lastAccessedAt: "",
    ...overrides,
  };
}

describe("library shares store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("loads and caches shares", async () => {
    const store = useLibrarySharesStore();
    const spy = vi.spyOn(api, "libraryShares").mockResolvedValue({ shares: [makeShare()] });

    await store.load();
    expect(store.shares).toHaveLength(1);
    await store.load();
    expect(spy).toHaveBeenCalledTimes(1);

    await store.load(true);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("creates a share and prepends it to the list", async () => {
    const store = useLibrarySharesStore();
    const created = makeShare({ id: 2, token: "tok-2" });
    vi.spyOn(api, "createLibraryShare").mockResolvedValue({ share: created, accessCode: "ABC234" });

    const result = await store.create({ entryId: 20, permission: "view", requireAccessCode: true, expiresAt: "" });
    expect(result.accessCode).toBe("ABC234");
    expect(store.shares[0].id).toBe(2);
  });

  it("updates a share in place", async () => {
    const store = useLibrarySharesStore();
    store.apply([makeShare({ id: 3, permission: "view" })]);
    vi.spyOn(api, "updateLibraryShare").mockResolvedValue({ share: makeShare({ id: 3, permission: "download" }) });

    const updated = await store.update(3, { permission: "download" });
    expect(updated.permission).toBe("download");
    expect(store.shares.find((s) => s.id === 3)?.permission).toBe("download");
  });

  it("removes a share", async () => {
    const store = useLibrarySharesStore();
    store.apply([makeShare({ id: 4 }), makeShare({ id: 5 })]);
    vi.spyOn(api, "deleteLibraryShare").mockResolvedValue({ ok: true });

    await store.remove(4);
    expect(store.shares.map((s) => s.id)).toEqual([5]);
  });

  it("resets a share access code", async () => {
    const store = useLibrarySharesStore();
    store.apply([makeShare({ id: 6, requiresAccessCode: false })]);
    vi.spyOn(api, "resetLibraryShareCode").mockResolvedValue({
      share: makeShare({ id: 6, requiresAccessCode: true }),
      accessCode: "NEW567",
    });

    const result = await store.resetCode(6);
    expect(result.accessCode).toBe("NEW567");
    expect(store.shares.find((s) => s.id === 6)?.requiresAccessCode).toBe(true);
  });
});

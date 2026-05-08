import { defineStore } from "pinia";
import { api, type RecentCopyTargetItem } from "@/api/client";

export interface RecentCopyTarget {
  space: "library" | "public" | "class";
  classId: number | null;
  path: string;
  label: string;
  pinned?: boolean;
}

function sameRecentTarget(left: RecentCopyTarget, right: RecentCopyTarget) {
  return left.space === right.space && left.classId === right.classId && left.path === right.path;
}

function normalizeRecentCopyTargets(items: RecentCopyTarget[]) {
  const pinned = items.filter((item) => item.pinned);
  const recent = items.filter((item) => !item.pinned);
  return [...pinned, ...recent].slice(0, 5);
}

function toRecentCopyTargetPayload(items: RecentCopyTarget[]): RecentCopyTargetItem[] {
  return items.map((item) => ({
    space: item.space,
    classId: item.classId ?? undefined,
    path: item.path,
    label: item.label,
    pinned: item.pinned,
  }));
}

export const useRecentCopyTargetsStore = defineStore("recent-copy-targets", {
  state: () => ({
    items: [] as RecentCopyTarget[],
    loaded: false,
  }),
  getters: {
    pinnedCount: (state) => state.items.filter((item) => item.pinned).length,
  },
  actions: {
    clear() {
      this.items = [];
      this.loaded = false;
    },
    apply(items: RecentCopyTarget[]) {
      this.items = normalizeRecentCopyTargets(items);
      this.loaded = true;
    },
    async load(force = false) {
      if (this.loaded && !force) {
        return this.items;
      }
      try {
        const response = await api.recentCopyTargets();
        this.apply(
          response.items.map((item) => ({
            space: item.space as RecentCopyTarget["space"],
            classId: item.classId ?? null,
            path: item.path,
            label: item.label,
            pinned: item.pinned,
          })),
        );
      } catch {
        this.items = [];
        this.loaded = true;
      }
      return this.items;
    },
    async persist(items: RecentCopyTarget[]) {
      const nextItems = normalizeRecentCopyTargets(items);
      this.items = nextItems;
      this.loaded = true;
      await api.saveRecentCopyTargets(toRecentCopyTargetPayload(nextItems));
      return this.items;
    },
    async remember(target: RecentCopyTarget) {
      const pinned = this.items.filter((item) => item.pinned);
      const recent = this.items.filter((item) => !item.pinned);
      const pinnedMatch = pinned.find((item) => sameRecentTarget(item, target));

      if (pinnedMatch) {
        return this.persist([
          ...pinned.map((item) => (sameRecentTarget(item, target) ? { ...item, label: target.label } : item)),
          ...recent,
        ]);
      }

      return this.persist([
        ...pinned,
        { ...target, pinned: false },
        ...recent.filter((item) => !sameRecentTarget(item, target)),
      ]);
    },
    async togglePinned(index: number) {
      const target = this.items[index];
      if (!target) {
        return this.items;
      }

      const pinned = this.items.filter((item) => item.pinned);
      const recent = this.items.filter((item) => !item.pinned);
      if (target.pinned) {
        return this.persist([
          ...pinned.filter((item) => !sameRecentTarget(item, target)),
          { ...target, pinned: false },
          ...recent,
        ]);
      }

      return this.persist([
        ...pinned,
        { ...target, pinned: true },
        ...recent.filter((item) => !sameRecentTarget(item, target)),
      ]);
    },
    async movePinned(index: number, direction: -1 | 1) {
      const pinned = this.items.filter((item) => item.pinned);
      const recent = this.items.filter((item) => !item.pinned);
      if (index < 0 || index >= pinned.length) {
        return this.items;
      }

      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= pinned.length) {
        return this.items;
      }

      const nextPinned = [...pinned];
      [nextPinned[index], nextPinned[nextIndex]] = [nextPinned[nextIndex], nextPinned[index]];
      return this.persist([...nextPinned, ...recent]);
    },
    async clearUnpinned() {
      return this.persist(this.items.filter((item) => item.pinned));
    },
  },
});

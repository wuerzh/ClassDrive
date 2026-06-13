import { defineStore } from "pinia";
import {
  api,
  type CreateLibrarySharePayload,
  type LibraryShareItem,
  type LibraryShareMutationResult,
  type UpdateLibrarySharePayload,
} from "@/api/client";

function cloneShare(item: LibraryShareItem): LibraryShareItem {
  return { ...item };
}

export const useLibrarySharesStore = defineStore("library-shares", {
  state: () => ({
    shares: [] as LibraryShareItem[],
    loading: false,
  }),
  actions: {
    clear() {
      this.shares = [];
      this.loading = false;
    },
    apply(items: LibraryShareItem[]) {
      this.shares = items.map(cloneShare);
    },
    async load(force = false) {
      if (this.shares.length > 0 && !force) {
        return this.shares;
      }
      this.loading = true;
      try {
        const response = await api.libraryShares();
        this.apply(response.shares ?? []);
        return this.shares;
      } finally {
        this.loading = false;
      }
    },
    async create(payload: CreateLibrarySharePayload): Promise<LibraryShareMutationResult> {
      const result = await api.createLibraryShare(payload);
      this.shares = [cloneShare(result.share), ...this.shares];
      return result;
    },
    async update(id: number, payload: UpdateLibrarySharePayload): Promise<LibraryShareItem> {
      const response = await api.updateLibraryShare(id, payload);
      this.shares = this.shares.map((item) => (item.id === id ? cloneShare(response.share) : item));
      return response.share;
    },
    async remove(id: number) {
      await api.deleteLibraryShare(id);
      this.shares = this.shares.filter((item) => item.id !== id);
    },
    async resetCode(id: number): Promise<LibraryShareMutationResult> {
      const result = await api.resetLibraryShareCode(id);
      this.shares = this.shares.map((item) => (item.id === id ? cloneShare(result.share) : item));
      return result;
    },
  },
});

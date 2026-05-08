import { defineStore } from "pinia";

export interface ToastMessage {
  id: number;
  tone: "success" | "warning" | "error";
  text: string;
}

export const useToastStore = defineStore("toast", {
  state: () => ({
    items: [] as ToastMessage[],
    nextId: 1,
  }),
  actions: {
    push(tone: ToastMessage["tone"], text: string) {
      const id = this.nextId++;
      this.items.push({ id, tone, text });
      window.setTimeout(() => {
        this.remove(id);
      }, 2500);
    },
    remove(id: number) {
      this.items = this.items.filter((item) => item.id !== id);
    },
  },
});

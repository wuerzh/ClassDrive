import { defineStore } from "pinia";

export interface ToastMessage {
  id: number;
  tone: "success" | "warning" | "error";
  text: string;
  timerId?: number;
}

export const useToastStore = defineStore("toast", {
  state: () => ({
    items: [] as ToastMessage[],
    nextId: 1,
  }),
  actions: {
    push(tone: ToastMessage["tone"], text: string) {
      const id = this.nextId++;
      const timerId = window.setTimeout(() => {
        this.remove(id);
      }, 2500);
      this.items.push({ id, tone, text, timerId });
    },
    remove(id: number) {
      const item = this.items.find((item) => item.id === id);
      if (item?.timerId !== undefined) {
        window.clearTimeout(item.timerId);
      }
      this.items = this.items.filter((item) => item.id !== id);
    },
    clearAll() {
      // Clear all pending timers
      this.items.forEach((item) => {
        if (item.timerId !== undefined) {
          window.clearTimeout(item.timerId);
        }
      });
      this.items = [];
    },
  },
});

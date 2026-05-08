import { defineStore } from "pinia";

export interface UploadItemState {
  id: string;
  name: string;
  relativePath?: string;
  totalBytes: number;
  sentBytes: number;
  status: "pending" | "uploading" | "done" | "failed" | "aborted";
}

interface UploadBatchItem {
  id?: string;
  name: string;
  relativePath?: string;
  totalBytes: number;
}

function clampBytes(value: number, totalBytes: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (totalBytes <= 0) {
    return Math.max(0, Math.round(value));
  }
  return Math.min(totalBytes, Math.max(0, Math.round(value)));
}

export const useUploadStore = defineStore("upload", {
  state: () => ({
    totalBytes: 0,
    sentBytes: 0,
    items: [] as UploadItemState[],
    speedBytesPerSecond: 0,
    etaSeconds: null as number | null,
    abortRequested: false,
    startedAt: null as number | null,
    abortHandler: null as (() => void) | null,
    finishTimerId: null as number | null,
    batchCounter: 0,
  }),
  getters: {
    active: (state) => state.totalBytes > 0,
    percent: (state) => {
      if (state.totalBytes <= 0) {
        return 0;
      }
      return Math.min(100, Math.round((state.sentBytes / state.totalBytes) * 100));
    },
  },
  actions: {
    clearFinishTimer() {
      if (this.finishTimerId !== null) {
        window.clearTimeout(this.finishTimerId);
        this.finishTimerId = null;
      }
    },
    reset() {
      this.clearFinishTimer();
      this.totalBytes = 0;
      this.sentBytes = 0;
      this.items = [];
      this.speedBytesPerSecond = 0;
      this.etaSeconds = null;
      this.abortRequested = false;
      this.startedAt = null;
      this.abortHandler = null;
    },
    refreshMetrics() {
      if (this.totalBytes <= 0) {
        this.speedBytesPerSecond = 0;
        this.etaSeconds = null;
        return;
      }
      if (this.sentBytes <= 0) {
        this.speedBytesPerSecond = 0;
        this.etaSeconds = null;
        return;
      }
      if (this.startedAt === null) {
        this.startedAt = Date.now();
      }
      const elapsedMs = Date.now() - this.startedAt;
      if (elapsedMs <= 0) {
        return;
      }
      const speed = Math.max(0, Math.round((this.sentBytes * 1000) / elapsedMs));
      this.speedBytesPerSecond = speed;
      if (this.sentBytes >= this.totalBytes) {
        this.etaSeconds = 0;
        return;
      }
      this.etaSeconds = speed > 0 ? Math.ceil((this.totalBytes - this.sentBytes) / speed) : null;
    },
    applyAggregateProgress(sentBytes: number, totalBytes?: number) {
      const nextTotalBytes = totalBytes === undefined ? this.totalBytes : totalBytes;
      this.totalBytes = Math.max(0, Math.round(nextTotalBytes));
      this.sentBytes = clampBytes(sentBytes, this.totalBytes);
      if (this.items.length > 0) {
        let remaining = this.sentBytes;
        this.items = this.items.map((item) => {
          if (item.status === "failed" || item.status === "aborted") {
            remaining = Math.max(0, remaining - item.sentBytes);
            return item;
          }
          const nextSentBytes = clampBytes(remaining, item.totalBytes);
          remaining = Math.max(0, remaining - nextSentBytes);
          let status: UploadItemState["status"] = "pending";
          if (item.totalBytes === 0) {
            status = this.sentBytes >= this.totalBytes ? "done" : item.status;
          } else if (nextSentBytes >= item.totalBytes) {
            status = "done";
          } else if (nextSentBytes > 0) {
            status = "uploading";
          }
          return {
            ...item,
            sentBytes: nextSentBytes,
            status,
          };
        });
      }
      this.refreshMetrics();
    },
    beginBatch(items: UploadBatchItem[]) {
      this.clearFinishTimer();
      this.batchCounter += 1;
      this.abortRequested = false;
      this.abortHandler = null;
      this.startedAt = Date.now();
      this.speedBytesPerSecond = 0;
      this.etaSeconds = null;
      this.items = items.map((item, index) => ({
        id: item.id ?? `upload-item-${this.batchCounter}-${index + 1}`,
        name: item.name,
        relativePath: item.relativePath,
        totalBytes: item.totalBytes,
        sentBytes: 0,
        status: "pending",
      }));
      this.totalBytes = items.reduce((sum, item) => sum + item.totalBytes, 0);
      this.sentBytes = 0;
    },
    setAbortHandler(handler: (() => void) | null) {
      this.abortHandler = handler;
    },
    start(totalBytes: number) {
      this.clearFinishTimer();
      this.abortRequested = false;
      this.totalBytes = Math.max(0, Math.round(totalBytes));
      if (this.items.length === 0 || this.sentBytes === 0) {
        this.sentBytes = 0;
      }
      if (this.startedAt === null && this.totalBytes > 0) {
        this.startedAt = Date.now();
      }
      if (this.items.length === 0) {
        this.speedBytesPerSecond = 0;
        this.etaSeconds = this.totalBytes > 0 ? null : 0;
      }
    },
    progress(sentBytes: number) {
      this.applyAggregateProgress(sentBytes);
    },
    markBatchDone() {
      this.abortRequested = false;
      this.applyAggregateProgress(this.totalBytes, this.totalBytes);
      this.items = this.items.map((item) => ({
        ...item,
        sentBytes: item.totalBytes,
        status: "done",
      }));
      this.speedBytesPerSecond = 0;
      this.etaSeconds = 0;
    },
    markFailedAt(sentBytes?: number) {
      if (this.items.length === 0) {
        this.refreshMetrics();
        return;
      }
      const clampedSentBytes = clampBytes(sentBytes === undefined ? this.sentBytes : sentBytes, this.totalBytes);
      this.sentBytes = clampedSentBytes;
      let consumed = 0;
      let failedAssigned = false;
      const nextItems: UploadItemState[] = this.items.map((item): UploadItemState => {
        if (item.status === "done") {
          consumed += item.totalBytes;
          return item;
        }
        if (failedAssigned) {
          return item.status === "pending" ? item : { ...item, status: "pending" };
        }
        const itemStart = consumed;
        const itemEnd = itemStart + item.totalBytes;
        const withinItem = clampBytes(clampedSentBytes - itemStart, item.totalBytes);
        consumed = itemEnd;
        if (clampedSentBytes >= itemEnd && item.totalBytes > 0) {
          return {
            ...item,
            sentBytes: item.totalBytes,
            status: "done",
          };
        }
        failedAssigned = true;
        return {
          ...item,
          sentBytes: withinItem,
          status: "failed",
        };
      });
      if (!failedAssigned) {
        const lastIndex = nextItems.length - 1;
        const lastItem = nextItems[lastIndex];
        if (lastItem) {
          nextItems[lastIndex] = {
            ...lastItem,
            sentBytes: lastItem.totalBytes,
            status: "failed",
          };
        }
      }
      this.items = nextItems;
      this.speedBytesPerSecond = 0;
      this.etaSeconds = null;
    },
    markBatchAborted() {
      this.abortRequested = true;
      this.speedBytesPerSecond = 0;
      this.etaSeconds = null;
      this.items = this.items.map((item) => {
        if (item.status === "done") {
          return item;
        }
        return {
          ...item,
          status: "aborted",
        };
      });
    },
    abort() {
      if (!this.active) {
        return;
      }
      this.abortRequested = true;
      this.markBatchAborted();
      this.abortHandler?.();
    },
    finish() {
      this.clearFinishTimer();
      const hasTerminalFailure = this.items.some((item) => item.status === "failed" || item.status === "aborted");
      if (!hasTerminalFailure) {
        this.markBatchDone();
      } else {
        this.speedBytesPerSecond = 0;
        this.etaSeconds = null;
      }
      this.finishTimerId = window.setTimeout(() => {
        this.reset();
      }, 300);
    },
  },
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import UploadBar from "@/components/UploadBar.vue";
import { useUploadStore } from "@/stores/upload";

interface UploadItemState {
  id: string;
  name: string;
  relativePath?: string;
  totalBytes: number;
  sentBytes: number;
  status: "pending" | "uploading" | "done" | "failed" | "aborted";
}

interface UploadStoreShape {
  totalBytes: number;
  sentBytes: number;
  items: UploadItemState[];
  speedBytesPerSecond: number;
  etaSeconds: number | null;
  abort: () => void;
}

describe("UploadBar upload panel", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("shows the upload panel with each file and aggregate metrics after upload starts", () => {
    const uploadStore = useUploadStore() as unknown as UploadStoreShape;
    uploadStore.totalBytes = 1000;
    uploadStore.sentBytes = 250;
    uploadStore.speedBytesPerSecond = 125;
    uploadStore.etaSeconds = 6;
    uploadStore.items = [
      {
        id: "file-1",
        name: "课件.pdf",
        totalBytes: 400,
        sentBytes: 400,
        status: "done",
      },
      {
        id: "file-2",
        name: "作业/答案.docx",
        relativePath: "作业/答案.docx",
        totalBytes: 600,
        sentBytes: 200,
        status: "uploading",
      },
    ];

    const wrapper = mount(UploadBar);

    expect(wrapper.find('[data-testid="upload-panel"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="upload-total-progress"]').text()).toContain("25%");
    expect(wrapper.get('[data-testid="upload-speed"]').text()).toContain("125 B/s");
    expect(wrapper.get('[data-testid="upload-eta"]').text()).toContain("6s");
    expect(wrapper.text()).toContain("课件.pdf");
    expect(wrapper.text()).toContain("作业/答案.docx");
    expect(wrapper.get('[data-testid="upload-item-progress-file-2"]').text()).toContain("33%");
  });

  it("supports collapse, expand, and abort for the current batch", async () => {
    const uploadStore = useUploadStore() as unknown as UploadStoreShape;
    const abortSpy = vi.fn();
    Object.assign(uploadStore, {
      totalBytes: 10,
      sentBytes: 2,
      speedBytesPerSecond: 10,
      etaSeconds: 1,
      items: [
        {
          id: "file-1",
          name: "课堂记录.txt",
          totalBytes: 10,
          sentBytes: 2,
          status: "uploading",
        },
      ],
      abort: abortSpy,
    });

    const wrapper = mount(UploadBar);

    expect(wrapper.find('[data-testid="upload-panel"]').exists()).toBe(true);

    await wrapper.get('[data-testid="upload-toggle"]').trigger("click");
    expect(wrapper.find('[data-testid="upload-panel"]').exists()).toBe(false);

    await wrapper.get('[data-testid="upload-toggle"]').trigger("click");
    expect(wrapper.find('[data-testid="upload-panel"]').exists()).toBe(true);

    await wrapper.get('[data-testid="upload-abort"]').trigger("click");
    expect(abortSpy).toHaveBeenCalledTimes(1);
  });

  it("hides the upload console when the upload panel feature is disabled", () => {
    const uploadStore = useUploadStore() as unknown as UploadStoreShape;
    uploadStore.totalBytes = 100;
    uploadStore.sentBytes = 50;
    uploadStore.items = [
      {
        id: "file-1",
        name: "已上传一半.txt",
        totalBytes: 100,
        sentBytes: 50,
        status: "uploading",
      },
    ];

    const wrapper = mount(UploadBar, {
      props: {
        enabled: false,
      },
    });

    expect(wrapper.find('[data-testid="upload-panel"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("上传任务");
  });
});

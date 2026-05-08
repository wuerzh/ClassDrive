import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import FilePreviewDialog from "@/components/FilePreviewDialog.vue";

const previewItem = {
  id: 1,
  name: "课堂示例.pdf",
  kind: "file" as const,
  previewUrl: "/api/files/1/preview",
  downloadUrl: "/api/files/1/download",
};

describe("FilePreviewDialog", () => {
  it("toggles a maximized preview layout from the dialog header", async () => {
    const wrapper = mount(FilePreviewDialog, {
      props: {
        item: previewItem,
        kind: "pdf",
        loading: false,
        errorText: "",
        textContent: "",
        canEdit: false,
      },
    });

    const dialog = wrapper.get('[data-testid="file-preview-surface"]');
    const maximizeButton = wrapper.get('[data-testid="file-preview-maximize"]');

    expect(maximizeButton.text()).toContain("最大化");
    expect(dialog.classes()).not.toContain("preview-dialog--maximized");

    await maximizeButton.trigger("click");

    expect(maximizeButton.text()).toContain("还原");
    expect(dialog.classes()).toContain("preview-dialog--maximized");

    await maximizeButton.trigger("click");

    expect(maximizeButton.text()).toContain("最大化");
    expect(dialog.classes()).not.toContain("preview-dialog--maximized");
  });
});

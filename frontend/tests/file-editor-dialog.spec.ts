import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import FileEditorDialog from "@/components/FileEditorDialog.vue";

const textItem = {
  id: 1,
  name: "教学安排.txt",
  path: "/教学安排.txt",
  kind: "file" as const,
  size: 24,
  downloadUrl: "/api/files/1/download",
  previewUrl: "/api/files/1/preview",
};

describe("FileEditorDialog", () => {
  it("labels the dialog with a real title element id", () => {
    const wrapper = mount(FileEditorDialog, {
      props: {
        item: textItem,
        content: "本周完成课程导入。",
        loading: false,
        saving: false,
        errorText: "",
        disabledSave: false,
        dirty: false,
      },
    });

    const dialog = wrapper.get('[data-testid="file-editor-dialog"]');
    const title = wrapper.get('[data-testid="file-editor-title"]');

    expect(dialog.attributes("role")).toBe("dialog");
    expect(dialog.attributes("aria-modal")).toBe("true");
    expect(dialog.attributes("aria-labelledby")).toBe("file-editor-title");
    expect(title.attributes("id")).toBe("file-editor-title");
  });
});

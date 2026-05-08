import { describe, expect, it } from "vitest";
import { getFilePreviewKind } from "@/utils/file-preview";

describe("file preview kind", () => {
  it("detects common image files from extension when MIME type is absent", () => {
    expect(getFilePreviewKind({ kind: "file", name: "photo.JPG" })).toBe("image");
    expect(getFilePreviewKind({ kind: "file", name: "scan.png" })).toBe("image");
    expect(getFilePreviewKind({ kind: "file", name: "cover.webp" })).toBe("image");
  });

  it("detects PDF files from extension when MIME type is absent", () => {
    expect(getFilePreviewKind({ kind: "file", name: "49梁桂瑛.pdf" })).toBe("pdf");
    expect(getFilePreviewKind({ kind: "file", name: "REPORT.PDF" })).toBe("pdf");
  });
});

import { describe, expect, it, vi } from "vitest";
import { exportRowsToSpreadsheet } from "@/utils/spreadsheet-export";

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Blob read failed")));
    reader.readAsText(blob);
  });
}

describe("exportRowsToSpreadsheet", () => {
  it("exports user-controlled cells as escaped text and neutralizes spreadsheet formulas", async () => {
    let exportedBlob: Blob | null = null;
    const createObjectURL = vi.fn((blob: Blob) => {
      exportedBlob = blob;
      return "blob:spreadsheet";
    });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    exportRowsToSpreadsheet({
      fileName: "审计日志",
      sheetName: "日志审计",
      columns: [
        { header: "姓名", value: (row: { name: string; note: string }) => row.name },
        { header: "备注", value: (row: { name: string; note: string }) => row.note },
      ],
      rows: [
        { name: "=HYPERLINK(\"http://attacker.example\")", note: "正常 <b>备注</b>" },
        { name: "  +SUM(1,2)", note: "@cmd" },
      ],
    });

    expect(exportedBlob).not.toBeNull();
    const html = await readBlobAsText(exportedBlob!);
    expect(html).toContain("&#39;=HYPERLINK(&quot;http://attacker.example&quot;)");
    expect(html).toContain("&#39;  +SUM(1,2)");
    expect(html).toContain("&#39;@cmd");
    expect(html).toContain("正常 &lt;b&gt;备注&lt;/b&gt;");
    expect(html).not.toContain("<b>备注</b>");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:spreadsheet");
  });
});

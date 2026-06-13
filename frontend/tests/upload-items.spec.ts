import { describe, expect, it } from "vitest";
import { filterRedundantDirectoryArchives } from "@/utils/upload-items";
import type { UploadFileItem } from "@/api/client";

function uploadItem(fileName: string, relativePath?: string): UploadFileItem {
  return {
    file: new File(["content"], fileName),
    relativePath,
  };
}

describe("filterRedundantDirectoryArchives", () => {
  it("removes archives that duplicate an uploaded directory root", () => {
    const directoryFile = uploadItem("guide.txt", "课程包/guide.txt");
    const nestedFile = uploadItem("answer.txt", "课程包/练习/answer.txt");
    const duplicateArchive = uploadItem("课程包.zip");
    const siblingFile = uploadItem("说明.txt");

    const result = filterRedundantDirectoryArchives([
      duplicateArchive,
      directoryFile,
      siblingFile,
      nestedFile,
    ]);

    expect(result).toEqual([directoryFile, siblingFile, nestedFile]);
  });

  it("keeps archives that are not the same name as an uploaded directory root", () => {
    const archive = uploadItem("备份.zip");
    const directoryFile = uploadItem("guide.txt", "课程包/guide.txt");

    const result = filterRedundantDirectoryArchives([archive, directoryFile]);

    expect(result).toEqual([archive, directoryFile]);
  });

  it("keeps archives inside a selected directory", () => {
    const archiveInsideDirectory = uploadItem("练习.rar", "课程包/练习.rar");
    const nestedFile = uploadItem("answer.txt", "课程包/练习/answer.txt");

    const result = filterRedundantDirectoryArchives([archiveInsideDirectory, nestedFile]);

    expect(result).toEqual([archiveInsideDirectory, nestedFile]);
  });
});

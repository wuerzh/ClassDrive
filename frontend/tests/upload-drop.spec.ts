import { describe, expect, it } from "vitest";
import { collectDroppedUploadItems } from "@/utils/upload-drop";

interface FakeFileEntry {
  isFile: true;
  isDirectory: false;
  name: string;
  file(callback: (file: File) => void): void;
}

interface FakeDirectoryEntry {
  isFile: false;
  isDirectory: true;
  name: string;
  createReader(): {
    readEntries(callback: (entries: Array<FakeEntry>) => void): void;
  };
}

type FakeEntry = FakeFileEntry | FakeDirectoryEntry;

function createFileEntry(file: File): FakeFileEntry {
  return {
    isFile: true,
    isDirectory: false,
    name: file.name,
    file(callback) {
      callback(file);
    },
  };
}

function createDirectoryEntry(name: string, children: FakeEntry[]): FakeDirectoryEntry {
  return {
    isFile: false,
    isDirectory: true,
    name,
    createReader() {
      let done = false;
      return {
        readEntries(callback) {
          if (done) {
            callback([]);
            return;
          }
          done = true;
          callback(children);
        },
      };
    },
  };
}

describe("collectDroppedUploadItems", () => {
  it("falls back to flat files when entries are unavailable", async () => {
    const firstFile = new File(["a"], "alpha.txt", { type: "text/plain" });
    const secondFile = new File(["b"], "beta.txt", { type: "text/plain" });
    const dataTransfer = {
      items: [],
      files: [firstFile, secondFile],
    } as unknown as DataTransfer;

    const items = await collectDroppedUploadItems(dataTransfer);

    expect(items).toEqual([{ file: firstFile }, { file: secondFile }]);
  });

  it("collects directory trees and preserves relative paths", async () => {
    const guideFile = new File(["guide"], "guide.txt", { type: "text/plain" });
    const answerFile = new File(["answer"], "answer.txt", { type: "text/plain" });
    const archiveFile = new File(["archive"], "作业.rar", { type: "application/x-rar-compressed" });
    const dataTransfer = {
      items: [
        {
          webkitGetAsEntry: () =>
            createDirectoryEntry("目录包", [
              createFileEntry(guideFile),
              createFileEntry(archiveFile),
              createDirectoryEntry("作业", [createFileEntry(answerFile)]),
            ]),
        },
      ],
      files: [],
    } as unknown as DataTransfer;

    const items = await collectDroppedUploadItems(dataTransfer);

    expect(items).toEqual([
      { file: guideFile, relativePath: "目录包/guide.txt" },
      { file: archiveFile, relativePath: "目录包/作业.rar" },
      { file: answerFile, relativePath: "目录包/作业/answer.txt" },
    ]);
  });
});

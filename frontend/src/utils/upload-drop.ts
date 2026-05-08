import type { UploadFileItem } from "@/api/client";

interface DragEntryReader {
  readEntries(callback: (entries: DragEntry[]) => void): void;
}

interface DragFileEntry {
  isFile: true;
  isDirectory: false;
  name: string;
  file(callback: (file: File) => void): void;
}

interface DragDirectoryEntry {
  isFile: false;
  isDirectory: true;
  name: string;
  createReader(): DragEntryReader;
}

type DragEntry = DragFileEntry | DragDirectoryEntry;

async function readDirectoryEntries(reader: DragEntryReader): Promise<DragEntry[]> {
  const collected: DragEntry[] = [];

  while (true) {
    const batch = await new Promise<DragEntry[]>((resolve) => {
      reader.readEntries((entries) => resolve(entries));
    });
    if (batch.length === 0) {
      return collected;
    }
    collected.push(...batch);
  }
}

async function collectEntry(entry: DragEntry, prefix = ""): Promise<UploadFileItem[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve) => {
      entry.file((nextFile) => resolve(nextFile));
    });
    const relativePath = prefix ? `${prefix}/${file.name}` : undefined;
    return [{ file, relativePath }];
  }

  const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
  const children = await readDirectoryEntries(entry.createReader());
  const nestedItems = await Promise.all(children.map((child) => collectEntry(child, nextPrefix)));
  return nestedItems.flat();
}

export async function collectDroppedUploadItems(dataTransfer: DataTransfer): Promise<UploadFileItem[]> {
  const droppedItems: UploadFileItem[] = [];
  const transferItems = Array.from(dataTransfer.items ?? []);

  for (const item of transferItems) {
    if (typeof item.webkitGetAsEntry !== "function") {
      continue;
    }
    const entry = item.webkitGetAsEntry() as DragEntry | null;
    if (!entry) {
      continue;
    }
    droppedItems.push(...(await collectEntry(entry)));
  }

  return droppedItems.length > 0 ? droppedItems : Array.from(dataTransfer.files ?? []).map((file) => ({ file }));
}

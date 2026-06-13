import type { UploadFileItem } from "@/api/client";

const archiveExtensionPattern = /\.(zip|rar|7z|tar|tgz|gz|bz2|xz)$/i;

function topLevelDirectory(relativePath: string): string | null {
  const [firstSegment, ...rest] = relativePath.split("/").filter(Boolean);
  return firstSegment && rest.length > 0 ? firstSegment : null;
}

function archiveBaseName(fileName: string): string | null {
  const trimmed = fileName.trim();
  const extensionMatch = archiveExtensionPattern.exec(trimmed);
  if (!extensionMatch?.index) {
    return null;
  }
  return trimmed.slice(0, extensionMatch.index);
}

export function filterRedundantDirectoryArchives(items: UploadFileItem[]): UploadFileItem[] {
  const uploadedDirectoryRoots = new Set<string>();
  for (const item of items) {
    if (!item.relativePath) {
      continue;
    }
    const root = topLevelDirectory(item.relativePath);
    if (root) {
      uploadedDirectoryRoots.add(root);
    }
  }
  if (uploadedDirectoryRoots.size === 0) {
    return items;
  }
  return items.filter((item) => {
    if (item.relativePath) {
      return true;
    }
    const baseName = archiveBaseName(item.file.name);
    return !baseName || !uploadedDirectoryRoots.has(baseName);
  });
}

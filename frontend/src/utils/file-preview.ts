import type { FileItem } from "@/api/client";

export type FilePreviewKind = "image" | "pdf" | "audio" | "video" | "text" | "external";

const textExtensions = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".xml",
  ".yml",
  ".yaml",
  ".log",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".html",
  ".css",
  ".vue",
]);

const imageExtensions = new Set([
  ".apng",
  ".avif",
  ".bmp",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
]);

const pdfExtensions = new Set([
  ".pdf",
]);

const editableTextExtensions = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".json",
  ".csv",
  ".tsv",
  ".yml",
  ".yaml",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".html",
  ".css",
  ".vue",
]);

function extensionOf(name: string) {
  const index = name.lastIndexOf(".");
  if (index < 0) {
    return "";
  }
  return name.slice(index).toLowerCase();
}

function normalizeMimeType(value?: string) {
  return (value ?? "").toLowerCase().split(";")[0]?.trim() ?? "";
}

export function getFilePreviewKind(item: Pick<FileItem, "kind" | "name"> & { mimeType?: string }): FilePreviewKind {
  if (item.kind !== "file") {
    return "external";
  }

  const mimeType = normalizeMimeType(item.mimeType);
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType === "application/pdf") {
    return "pdf";
  }
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "application/javascript"
  ) {
    return "text";
  }

  const extension = extensionOf(item.name);
  if (imageExtensions.has(extension)) {
    return "image";
  }

  if (pdfExtensions.has(extension)) {
    return "pdf";
  }

  if (textExtensions.has(extension)) {
    return "text";
  }
  return "external";
}

export function canEditTextFile(item: Pick<FileItem, "kind" | "name"> & { mimeType?: string }) {
  if (item.kind !== "file") {
    return false;
  }

  const extension = extensionOf(item.name);
  if (editableTextExtensions.has(extension)) {
    return true;
  }

  if (extension !== "") {
    return false;
  }

  const mimeType = normalizeMimeType(item.mimeType);
  return (
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "application/javascript"
  );
}

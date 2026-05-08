export interface SpreadsheetColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

export interface SpreadsheetExportOptions<T> {
  fileName: string;
  sheetName: string;
  columns: readonly SpreadsheetColumn<T>[];
  rows: readonly T[];
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ensureSpreadsheetFileName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return "导出.xls";
  }
  return trimmed.toLowerCase().endsWith(".xls") ? trimmed : `${trimmed}.xls`;
}

export function exportRowsToSpreadsheet<T>(options: SpreadsheetExportOptions<T>): void {
  const headerCells = options.columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join("");
  const bodyRows = options.rows
    .map((row) => {
      const cells = options.columns
        .map((column) => `<td>${escapeHtml(column.value(row))}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  const html = `\ufeff<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(options.sheetName)}</title>
</head>
<body>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = ensureSpreadsheetFileName(options.fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export type CsvCell = string | number | null;

const cell = (value: CsvCell) => `"${String(value ?? "").replaceAll('"', '""')}"`;

/**
 * Downloads rows as a CSV file, built in the browser from data already on the page. The byte order
 * mark makes Excel read Cyrillic and Uzbek letters correctly.
 */
export function downloadCsv(filename: string, rows: CsvCell[][]) {
  const csv = `﻿${rows.map((row) => row.map(cell).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

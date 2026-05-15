/**
 * Excel / CSV yardımcıları (SheetJS — `xlsx` paketini kullanır).
 *
 * - `downloadExcel`  → satırları XLSX olarak indir
 * - `downloadCsv`    → satırları CSV olarak indir (UTF-8 BOM + Excel uyumlu)
 * - `parseExcel`     → kullanıcı bir dosya seçtiğinde satırları döner (xlsx/csv)
 *
 * Tüm fonksiyonlar client'ta çalışır. Server tarafında kullanmayın.
 */

import * as XLSX from "xlsx";

/** Excel satırı — anahtar/değer çiftleri (değerler string, number, boolean, null vb. olabilir). */
export type ExcelRow = Record<string, unknown>;

/**
 * Generic constraint — bir tipin Excel satırı olarak dışa aktarılabilmesi için
 * tüm alanlarının serialize edilebilir olması yeterlidir. Tipte index signature
 * şartı yok; named fields'lı interface'ler de geçer.
 */
export type ExcelSerializable = Record<string, unknown>;

/* ----------------------------------------------------------------------------
   Dosya indirme
   -------------------------------------------------------------------------- */

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Mikro gecikme: bazı tarayıcılar URL'i çok erken serbest bırakırsa indirme iptal olabilir
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/** Satırları Excel dosyası olarak indir. */
export function downloadExcel(
  rows: readonly object[],
  sheetName: string,
  fileName: string,
): void {
  const ws = XLSX.utils.json_to_sheet(rows as ExcelRow[]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheetName));
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  triggerDownload(new Blob([buf], { type: XLSX_MIME }), ensureExtension(fileName, "xlsx"));
}

/**
 * Satırları CSV olarak indir.
 * Türkçe karakterler için UTF-8 BOM eklenir, Excel doğru okur.
 */
export function downloadCsv(
  rows: readonly object[],
  fileName: string,
): void {
  const ws = XLSX.utils.json_to_sheet(rows as ExcelRow[]);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, ensureExtension(fileName, "csv"));
}

/* ----------------------------------------------------------------------------
   Dosya okuma (kullanıcının seçtiği dosyadan)
   -------------------------------------------------------------------------- */

/**
 * Kullanıcının seçtiği dosyayı oku — xlsx, xls veya csv.
 * İlk sayfanın satırlarını obje olarak döner.
 */
export async function parseExcel(file: File): Promise<ExcelRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return [];
  const ws = wb.Sheets[firstSheetName];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(ws, { defval: null });
  return rows;
}

/* ----------------------------------------------------------------------------
   İç yardımcılar
   -------------------------------------------------------------------------- */

function ensureExtension(name: string, ext: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(`.${ext}`)) return name;
  return `${name}.${ext}`;
}

/** Excel sayfa adında izin verilmeyen karakterleri temizle (max 31 karakter). */
function safeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, "_").slice(0, 31) || "Sayfa1";
}

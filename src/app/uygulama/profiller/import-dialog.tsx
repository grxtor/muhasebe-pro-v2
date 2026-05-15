"use client";

import { useState, useTransition } from "react";
import { Button } from "@heroui/react";
import { FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { DataModal } from "@/components/ui/data-modal";
import { parseExcel, type ExcelRow } from "@/lib/excel";
import { importProfiller, type ImportProfilRow } from "./actions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

const BEKLENEN_KOLONLAR = [
  "Kod",
  "Unvan",
  "Tip",
  "VergiNo",
  "Telefon",
  "Email",
  "Sehir",
  "AcilisBakiyesi",
  "Aktif",
];

export function ImportDialog({ isOpen, onClose, onImported }: Props) {
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setRows([]);
    setFileName("");
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseExcel(file);
      if (parsed.length === 0) {
        toast.error("Dosya boş veya okunamadı");
        return;
      }
      setRows(parsed);
      setFileName(file.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      toast.error(`Dosya okunamadı: ${msg}`);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleImport() {
    if (rows.length === 0) return;
    const result = await importProfiller(rows as ImportProfilRow[]);

    if (result.added === 0 && result.updated === 0 && result.failed === 0) {
      toast.error("İçe aktarılacak satır bulunamadı");
      return;
    }

    const ozet: string[] = [];
    if (result.added > 0) ozet.push(`${result.added} yeni`);
    if (result.updated > 0) ozet.push(`${result.updated} güncelleme`);
    if (result.failed > 0) ozet.push(`${result.failed} hata`);

    const msg = ozet.join(", ");
    if (result.failed === 0) {
      toast.success(`İçe aktarım tamam — ${msg}`);
    } else {
      toast.warning(`İçe aktarım kısmen başarılı — ${msg}`);
      // İlk hatayı detayda göster
      if (result.errors.length > 0) {
        toast.error(result.errors[0]);
      }
    }

    reset();
    onImported();
  }

  function onAction() {
    startTransition(() => {
      void handleImport();
    });
  }

  const ilkBesSatir = rows.slice(0, 5);
  const sutunlar = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <DataModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Profilleri İçe Aktar"
      description="Excel veya CSV dosyasından toplu profil ekle/güncelle"
      size="xl"
      footer={
        rows.length > 0 ? (
          <>
            <Button
              variant="ghost"
              size="md"
              onPress={handleClose}
              isDisabled={pending}
            >
              İptal
            </Button>
            <Button
              variant="primary"
              size="md"
              onPress={onAction}
              isDisabled={pending}
            >
              {pending ? "İçe aktarılıyor…" : `${rows.length} satırı içe aktar`}
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="md" onPress={handleClose}>
            Kapat
          </Button>
        )
      }
    >
      {rows.length === 0 ? (
        <div className="space-y-4">
          <div
            className="rounded-lg border-2 border-dashed p-6 text-center"
            style={{
              borderColor: "var(--border-strong)",
              background: "var(--surface-muted)",
            }}
          >
            <FileSpreadsheet
              size={36}
              className="mx-auto mb-3"
              style={{ color: "var(--text-muted)" }}
            />
            <p className="text-sm font-medium">Excel / CSV dosyası seçin</p>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              .xlsx, .xls veya .csv biçimi kabul edilir
            </p>
            <label className="mt-4 inline-block cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={onFileChange}
                className="hidden"
              />
              <span
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-foreground)",
                }}
              >
                <FileSpreadsheet size={14} />
                Dosya seç
              </span>
            </label>
          </div>

          <div
            className="rounded-lg border p-4 text-xs"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--text-muted)",
            }}
          >
            <div className="mb-1.5 flex items-center gap-1.5 font-medium" style={{ color: "var(--text)" }}>
              <AlertCircle size={13} /> Beklenen sütunlar
            </div>
            <p>
              Başlık satırı zorunludur. Sütun adları:{" "}
              <strong>{BEKLENEN_KOLONLAR.join(", ")}</strong> ve isteğe bağlı:
              VergiDairesi, TcKimlikNo, Adres, Notlar.
            </p>
            <p className="mt-1.5">
              <strong>Kod</strong> ve <strong>Unvan</strong> zorunludur.
              Mevcut profil aynı kod ile bulunursa güncellenir, yoksa eklenir.
              Önce mevcut profilleri &ldquo;Dışa Aktar&rdquo; ile indirip o
              şablonu kullanmanız önerilir.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className="flex items-center gap-2 rounded-lg border p-3 text-sm"
            style={{
              borderColor: "var(--border)",
              background: "var(--positive-soft)",
              color: "var(--positive)",
            }}
          >
            <CheckCircle2 size={16} />
            <span className="flex-1">
              <strong>{fileName}</strong> okundu — toplam{" "}
              <strong>{rows.length}</strong> satır.
            </span>
          </div>

          <div>
            <div
              className="mb-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              Önizleme (ilk 5 satır)
            </div>
            <div
              className="overflow-x-auto rounded-lg border"
              style={{ borderColor: "var(--border)" }}
            >
              <table className="w-full text-xs">
                <thead
                  className="text-left"
                  style={{
                    background: "var(--surface-muted)",
                    color: "var(--text-muted)",
                  }}
                >
                  <tr>
                    {sutunlar.map((s) => (
                      <th
                        key={s}
                        className="px-3 py-2 font-medium whitespace-nowrap"
                      >
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ilkBesSatir.map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        borderTop:
                          i === 0 ? "none" : "1px solid var(--border)",
                      }}
                    >
                      {sutunlar.map((s) => (
                        <td
                          key={s}
                          className="px-3 py-2 whitespace-nowrap"
                          style={{ color: "var(--text)" }}
                        >
                          {formatCell(row[s])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 5 && (
              <p
                className="mt-2 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                … ve {rows.length - 5} satır daha.
              </p>
            )}
          </div>

          <div
            className="rounded-lg border p-3 text-xs"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface-muted)",
              color: "var(--text-muted)",
            }}
          >
            <p>
              Mevcut profil <strong>Kod</strong> ile bulunup güncellenir.
              Bulunamayanlar yeni eklenir. Eksik veya geçersiz satırlar atlanır
              ve listelenir.
            </p>
          </div>
        </div>
      )}
    </DataModal>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toLocaleString("tr-TR");
  if (typeof value === "boolean") return value ? "Evet" : "Hayır";
  if (value instanceof Date) return value.toLocaleDateString("tr-TR");
  return String(value);
}

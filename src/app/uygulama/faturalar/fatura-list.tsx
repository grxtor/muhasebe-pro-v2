"use client";

import { useState, useTransition, useDeferredValue, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Paperclip,
  FileDown,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, TextInput } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatCard } from "@/components/ui/stat-card";
import { BulkActionBar, deleteBulkAction } from "@/components/ui/bulk-action-bar";
import { useBulkSelect } from "@/lib/hooks/use-bulk-select";
import { bulkDeleteFaturalar } from "@/lib/bulk-actions";
import { downloadExcel } from "@/lib/excel";
import { FaturaDialog } from "./fatura-dialog";
import { deleteFatura, exportFaturalar, getFaturaForPdf } from "./actions";
import { generateFaturaPdf } from "@/lib/fatura-pdf";
import {
  FaturaYonu,
  FaturaDurumu,
  faturaYonuEtiket,
  faturaDurumuEtiket,
} from "@/lib/enums";
import { formatPara, formatTarih } from "@/lib/format";

export interface FaturaRow {
  id: number;
  cariId: number;
  yon: string;
  faturaNo: string;
  tarih: string;
  vadeTarihi: string | null;
  isAciklamasi: string;
  tutar: string;
  kdvOrani: string;
  kdvTutari: string;
  toplamTutar: string;
  odenenTutar: string;
  paraBirimi: string;
  durum: string;
  notlar: string | null;
  cari: { kod: string; unvan: string };
  dekontSayisi: number;
}

export interface CariRef {
  id: number;
  kod: string;
  unvan: string;
}

interface Props {
  items: FaturaRow[];
  cariler: CariRef[];
  stats: { gonderilen: string; gelen: string; bekleyen: string; adet: number };
  sonrakiNo: string;
}

export function FaturaList({ items, cariler, stats, sonrakiNo }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [localQ, setLocalQ] = useState(params.get("q") ?? "");
  const deferredQ = useDeferredValue(localQ);
  const yon = params.get("yon") ?? "";
  const durum = params.get("durum") ?? "";

  useEffect(() => {
    const url = new URLSearchParams(params.toString());
    if (deferredQ) url.set("q", deferredQ);
    else url.delete("q");
    startTransition(() => {
      router.replace(`/uygulama/faturalar?${url.toString()}`, { scroll: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQ]);

  function setParam(key: string, value: string) {
    const url = new URLSearchParams(params.toString());
    if (value) url.set(key, value);
    else url.delete(key);
    startTransition(() => {
      router.replace(`/uygulama/faturalar?${url.toString()}`, { scroll: false });
    });
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FaturaRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FaturaRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null);

  async function onDownloadPdf(f: FaturaRow) {
    setPdfLoadingId(f.id);
    try {
      const r = await getFaturaForPdf(f.id);
      if (!r.ok || !r.data) {
        toast.error(r.ok ? "PDF verisi yüklenemedi" : r.error);
        return;
      }
      const blob = await generateFaturaPdf(r.data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Fatura-${f.faturaNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Fatura ${f.faturaNo} indirildi`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "PDF üretilirken hata oluştu",
      );
    } finally {
      setPdfLoadingId(null);
    }
  }

  // Bulk
  const bulk = useBulkSelect(items);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Excel
  const [exporting, setExporting] = useState(false);
  async function handleExport() {
    setExporting(true);
    try {
      const { rows } = await exportFaturalar({
        yon: yon || undefined,
        durum: durum || undefined,
      });
      if (rows.length === 0) {
        toast.warning("Dışa aktarılacak fatura yok");
        return;
      }
      const tarih = new Date().toISOString().slice(0, 10);
      downloadExcel(rows, "Faturalar", `faturalar-${tarih}.xlsx`);
      toast.success(`${rows.length} fatura dışa aktarıldı`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      toast.error(`Dışa aktarım başarısız: ${msg}`);
    } finally {
      setExporting(false);
    }
  }

  async function onBulkDelete() {
    setBulkDeleting(true);
    const r = await bulkDeleteFaturalar(bulk.selectedIds as number[]);
    setBulkDeleting(false);
    if (r.ok) {
      toast.success(`${r.count} fatura silindi`);
      bulk.clear();
      setBulkDeleteOpen(false);
      router.refresh();
    } else toast.error(r.error);
  }

  function openYeni() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openDuzenle(f: FaturaRow) {
    setEditing(f);
    setDialogOpen(true);
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteFatura(deleteTarget.id);
    setDeleting(false);
    if (result.ok) {
      toast.success(`Fatura ${deleteTarget.faturaNo} silindi`);
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <PageHeader
        icon={<Receipt size={20} />}
        title="Faturalar"
        subtitle="Gönderilen ve gelen tüm faturaların kaydı"
        actions={
          <>
            <Button
              variant="ghost"
              size="md"
              onPress={handleExport}
              isDisabled={exporting}
            >
              <span className="flex items-center gap-1.5">
                <Download size={16} />
                {exporting ? "Hazırlanıyor…" : "Dışa Aktar"}
              </span>
            </Button>
            <Button variant="primary" size="md" onPress={openYeni}>
              <span className="flex items-center gap-1.5">
                <Plus size={16} /> Yeni Fatura
              </span>
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <StatCard
          label="Gönderilen"
          value={formatPara(parseFloat(stats.gonderilen))}
          tone="positive"
          icon={<ArrowUpRight size={18} />}
        />
        <StatCard
          label="Gelen"
          value={formatPara(parseFloat(stats.gelen))}
          tone="negative"
          icon={<ArrowDownRight size={18} />}
        />
        <StatCard
          label="Bekleyen Tahsilat"
          value={formatPara(parseFloat(stats.bekleyen))}
          tone="warning"
        />
        <StatCard
          label="Fatura Adedi"
          value={String(stats.adet)}
          tone="neutral"
        />
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute top-3 left-3"
            style={{ color: "var(--text-soft)" }}
          />
          <TextInput
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder="Fatura no, açıklama, profil..."
            className="pl-9"
          />
        </div>
        <Select value={yon} onChange={(e) => setParam("yon", e.target.value)}>
          <option value="">Tüm Yönler</option>
          <option value={FaturaYonu.Gonderilen}>
            {faturaYonuEtiket.Gonderilen}
          </option>
          <option value={FaturaYonu.Gelen}>{faturaYonuEtiket.Gelen}</option>
        </Select>
        <Select
          value={durum}
          onChange={(e) => setParam("durum", e.target.value)}
        >
          <option value="">Tüm Durumlar</option>
          <option value={FaturaDurumu.Beklemede}>
            {faturaDurumuEtiket.Beklemede}
          </option>
          <option value={FaturaDurumu.KismiOdendi}>
            {faturaDurumuEtiket.KismiOdendi}
          </option>
          <option value={FaturaDurumu.Odendi}>
            {faturaDurumuEtiket.Odendi}
          </option>
          <option value={FaturaDurumu.Iptal}>
            {faturaDurumuEtiket.Iptal}
          </option>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Receipt size={22} />}
          title={localQ || yon || durum ? "Eşleşen fatura yok" : "Henüz fatura yok"}
          description="Yeni bir fatura ekleyerek başlayın. KDV otomatik hesaplanır."
          action={
            <Button variant="primary" size="md" onPress={openYeni}>
              <span className="flex items-center gap-1.5">
                <Plus size={16} /> Yeni Fatura
              </span>
            </Button>
          }
        />
      ) : (
        <div
          className="overflow-hidden rounded-xl border"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead
                className="text-left"
                style={{
                  background: "var(--surface-muted)",
                  color: "var(--text-muted)",
                }}
              >
                <tr>
                  <th className="w-8 px-2 py-3">
                    <input
                      type="checkbox"
                      checked={bulk.isAllSelected}
                      onChange={() =>
                        bulk.isAllSelected ? bulk.clear() : bulk.selectAll()
                      }
                      className="size-4 cursor-pointer rounded"
                      style={{ accentColor: "var(--accent)" }}
                      aria-label="Hepsini seç"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Fatura No</th>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 font-medium">Profil</th>
                  <th className="px-4 py-3 font-medium">Açıklama</th>
                  <th className="px-4 py-3 font-medium">Yön</th>
                  <th className="px-4 py-3 text-right font-medium">Toplam</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((f, i) => {
                  const isGonderilen = f.yon === FaturaYonu.Gonderilen;
                  return (
                    <tr
                      key={f.id}
                      className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                      style={{
                        borderTop:
                          i === 0 ? "none" : "1px solid var(--border)",
                        background: bulk.isSelected(f.id)
                          ? "var(--surface-muted)"
                          : undefined,
                      }}
                    >
                      <td className="w-8 px-2 py-3">
                        <input
                          type="checkbox"
                          checked={bulk.isSelected(f.id)}
                          onChange={() => bulk.toggle(f.id)}
                          className="size-4 cursor-pointer rounded"
                          style={{ accentColor: "var(--accent)" }}
                          aria-label={`${f.faturaNo} seç`}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">
                        <span className="inline-flex items-center gap-1">
                          {f.faturaNo}
                          {f.dekontSayisi > 0 && (
                            <span
                              className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-normal"
                              style={{
                                background: "var(--surface-muted)",
                                color: "var(--text-muted)",
                              }}
                              title={`${f.dekontSayisi} ek dosya`}
                            >
                              <Paperclip size={10} />
                              {f.dekontSayisi}
                            </span>
                          )}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 tabular-nums"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatTarih(f.tarih)}
                      </td>
                      <td className="px-4 py-3">{f.cari.unvan}</td>
                      <td
                        className="max-w-[300px] truncate px-4 py-3"
                        style={{ color: "var(--text-muted)" }}
                        title={f.isAciklamasi}
                      >
                        {f.isAciklamasi}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex rounded-full px-2 py-0.5 text-xs"
                          style={{
                            background: isGonderilen
                              ? "var(--positive-soft)"
                              : "var(--negative-soft)",
                            color: isGonderilen
                              ? "var(--positive)"
                              : "var(--negative)",
                          }}
                        >
                          {isGonderilen ? (
                            <ArrowUpRight size={11} className="mr-0.5" />
                          ) : (
                            <ArrowDownRight size={11} className="mr-0.5" />
                          )}
                          {
                            faturaYonuEtiket[
                              f.yon as keyof typeof faturaYonuEtiket
                            ]
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatPara(parseFloat(f.toplamTutar), f.paraBirimi)}
                      </td>
                      <td className="px-4 py-3">
                        <DurumBadge durum={f.durum} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => onDownloadPdf(f)}
                            disabled={pdfLoadingId === f.id}
                            className="rounded-md p-1.5 transition-colors hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
                            aria-label="PDF İndir"
                            title="PDF İndir"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <FileDown size={14} />
                          </button>
                          <button
                            onClick={() => openDuzenle(f)}
                            className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                            aria-label="Düzenle"
                            title="Düzenle"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(f)}
                            className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                            aria-label="Sil"
                            title="Sil"
                            style={{ color: "var(--negative)" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div
            className="border-t px-4 py-2.5 text-xs"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-muted)",
              background: "var(--surface-muted)",
            }}
          >
            Toplam {items.length} fatura
            {pending && " · güncelleniyor…"}
          </div>
        </div>
      )}

      <FaturaDialog
        isOpen={dialogOpen}
        fatura={editing}
        cariler={cariler}
        sonrakiNo={sonrakiNo}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={`Fatura ${deleteTarget?.faturaNo} silinsin mi?`}
        description="Bu işlem geri alınamaz. Bağlı alacak/borç kayıtları da silinmez ama bağlantısı kopar."
        confirmText="Sil"
        variant="danger"
        isLoading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
      />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        title={`${bulk.selectedCount} fatura silinsin mi?`}
        description="Bu işlem geri alınamaz."
        confirmText="Seçilenleri Sil"
        variant="danger"
        isLoading={bulkDeleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={onBulkDelete}
      />

      <BulkActionBar
        selectedCount={bulk.selectedCount}
        totalCount={bulk.totalCount}
        onClear={bulk.clear}
        onSelectAll={bulk.selectAll}
        actions={[
          deleteBulkAction(
            async () => setBulkDeleteOpen(true),
            bulk.selectedCount,
            bulkDeleting,
          ),
        ]}
      />
    </>
  );
}

function DurumBadge({ durum }: { durum: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    Beklemede: {
      bg: "var(--surface-muted)",
      color: "var(--text-muted)",
    },
    KismiOdendi: {
      bg: "var(--warning-soft)",
      color: "var(--warning)",
    },
    Odendi: {
      bg: "var(--positive-soft)",
      color: "var(--positive)",
    },
    Iptal: {
      bg: "var(--negative-soft)",
      color: "var(--negative)",
    },
  };
  const s = styles[durum] ?? styles.Beklemede;
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {
        faturaDurumuEtiket[
          durum as keyof typeof faturaDurumuEtiket
        ] ?? durum
      }
    </span>
  );
}

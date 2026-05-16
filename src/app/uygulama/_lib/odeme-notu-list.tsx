"use client";

import { useState, useTransition, useDeferredValue, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, TextInput } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BulkActionBar, deleteBulkAction } from "@/components/ui/bulk-action-bar";
import { useBulkSelect } from "@/lib/hooks/use-bulk-select";
import { bulkDeleteOdemeNotlari } from "@/lib/bulk-actions";
import { OdemeNotuDialog } from "./odeme-notu-dialog";
import {
  deleteOdemeNotu,
  tahsilEtVeyaOde,
} from "./odeme-notu-actions";
import {
  OdemeYonu,
  OdemeDurumu,
  odemeDurumuEtiket,
  CariTipi,
  harcamaTuruEtiket,
  type HarcamaTuru,
} from "@/lib/enums";
import { formatPara, formatTarih, formatVade } from "@/lib/format";

export interface OdemeNotuRow {
  id: number;
  cariId: number;
  baslik: string;
  aciklama: string | null;
  tutar: string;
  odenenTutar: string;
  paraBirimi: string;
  vadeTarihi: string;
  durum: string;
  odemeTarihi: string | null;
  detay: Record<string, unknown> | null;
  cari: {
    kod: string;
    unvan: string;
    tip: string;
    harcamaTuru: string | null;
  };
}

export interface CariRef {
  id: number;
  kod: string;
  unvan: string;
  tip: string;
  harcamaTuru: string | null;
}

interface Props {
  yon: typeof OdemeYonu.Alacak | typeof OdemeYonu.Borc;
  items: OdemeNotuRow[];
  cariler: CariRef[];
  istatistikler: {
    toplamBekleyen: string;
    vadesiGecen: number;
    bekleyenAdet: number;
  };
}

export function OdemeNotuList({
  yon,
  items,
  cariler,
  istatistikler,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const isAlacak = yon === OdemeYonu.Alacak;
  const labelTekil = isAlacak ? "Alacak" : "Borç";
  const labelEylem = isAlacak ? "Tahsil Et" : "Öde";

  const [localQ, setLocalQ] = useState(params.get("q") ?? "");
  const deferredQ = useDeferredValue(localQ);
  const durum = params.get("durum") ?? "";

  useEffect(() => {
    const url = new URLSearchParams(params.toString());
    if (deferredQ) url.set("q", deferredQ);
    else url.delete("q");
    startTransition(() => {
      router.replace(`${pathname}?${url.toString()}`, { scroll: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQ]);

  function changeDurum(value: string) {
    const url = new URLSearchParams(params.toString());
    if (value) url.set("durum", value);
    else url.delete("durum");
    startTransition(() => {
      router.replace(`${pathname}?${url.toString()}`, { scroll: false });
    });
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OdemeNotuRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OdemeNotuRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tahsilTarget, setTahsilTarget] = useState<OdemeNotuRow | null>(null);
  const [tahsiling, setTahsiling] = useState(false);

  // Bulk
  const bulk = useBulkSelect(items);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  async function onBulkDelete() {
    setBulkDeleting(true);
    const r = await bulkDeleteOdemeNotlari(bulk.selectedIds as number[]);
    setBulkDeleting(false);
    if (r.ok) {
      toast.success(`${r.count} kayıt silindi`);
      bulk.clear();
      setBulkDeleteOpen(false);
      router.refresh();
    } else toast.error(r.error);
  }

  function openYeni() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openDuzenle(o: OdemeNotuRow) {
    setEditing(o);
    setDialogOpen(true);
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteOdemeNotu(deleteTarget.id);
    setDeleting(false);
    if (result.ok) {
      toast.success(`"${deleteTarget.baslik}" silindi`);
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function onConfirmTahsil() {
    if (!tahsilTarget) return;
    setTahsiling(true);
    const result = await tahsilEtVeyaOde(tahsilTarget.id);
    setTahsiling(false);
    if (result.ok) {
      toast.success(
        isAlacak ? "Tahsilat kaydedildi" : "Ödeme kaydedildi",
      );
      setTahsilTarget(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <PageHeader
        icon={isAlacak ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
        title={isAlacak ? "Alacaklar" : "Borçlar"}
        subtitle={
          isAlacak
            ? "Bize ödeme yapacaklar — tahsil edilecek tutarlar"
            : "Bizim ödeyeceklerimiz — tedarikçi ve diğer borçlar"
        }
        actions={
          <Button variant="primary" size="md" onPress={openYeni}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Yeni {labelTekil}
            </span>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <KpiRow
          label={isAlacak ? "Bekleyen Tahsilat" : "Bekleyen Ödeme"}
          value={formatPara(parseFloat(istatistikler.toplamBekleyen))}
          tone={isAlacak ? "positive" : "negative"}
        />
        <KpiRow
          label="Bekleyen Adet"
          value={String(istatistikler.bekleyenAdet)}
          tone="neutral"
        />
        <KpiRow
          label="Vadesi Geçen"
          value={String(istatistikler.vadesiGecen)}
          tone={istatistikler.vadesiGecen > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute top-3 left-3"
            style={{ color: "var(--text-soft)" }}
          />
          <TextInput
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder="Başlık, profil, açıklama..."
            className="pl-9"
          />
        </div>
        <Select value={durum} onChange={(e) => changeDurum(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          <option value={OdemeDurumu.Beklemede}>
            {odemeDurumuEtiket.Beklemede}
          </option>
          <option value={OdemeDurumu.KismiOdendi}>
            {odemeDurumuEtiket.KismiOdendi}
          </option>
          <option value={OdemeDurumu.Odendi}>
            {odemeDurumuEtiket.Odendi}
          </option>
          <option value={OdemeDurumu.Iptal}>
            {odemeDurumuEtiket.Iptal}
          </option>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={22} />}
          title={`Henüz ${labelTekil.toLowerCase()} yok`}
          description={
            isAlacak
              ? "Yeni bir tahsilat kaydı ekleyerek başlayın."
              : "Yeni bir ödeme kaydı ekleyerek başlayın."
          }
          action={
            <Button variant="primary" size="md" onPress={openYeni}>
              <span className="flex items-center gap-1.5">
                <Plus size={16} /> Yeni {labelTekil}
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
                  <th className="px-4 py-3 font-medium">Başlık</th>
                  <th className="px-4 py-3 font-medium">Profil</th>
                  <th className="px-4 py-3 font-medium">Vade</th>
                  <th className="px-4 py-3 text-right font-medium">Tutar</th>
                  <th className="px-4 py-3 text-right font-medium">Kalan</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o, i) => {
                  const tutar = parseFloat(o.tutar);
                  const odenen = parseFloat(o.odenenTutar);
                  const kalan = tutar - odenen;
                  const vade = formatVade(o.vadeTarihi);
                  const bitti =
                    o.durum === OdemeDurumu.Odendi ||
                    o.durum === OdemeDurumu.Iptal;
                  return (
                    <tr
                      key={o.id}
                      className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                      style={{
                        borderTop:
                          i === 0 ? "none" : "1px solid var(--border)",
                        background: bulk.isSelected(o.id)
                          ? "var(--surface-muted)"
                          : undefined,
                      }}
                    >
                      <td className="w-8 px-2 py-3">
                        <input
                          type="checkbox"
                          checked={bulk.isSelected(o.id)}
                          onChange={() => bulk.toggle(o.id)}
                          className="size-4 cursor-pointer rounded"
                          style={{ accentColor: "var(--accent)" }}
                          aria-label={`${o.baslik} seç`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{o.baslik}</div>
                        {(() => {
                          const videoBasligi =
                            typeof o.detay?.videoBasligi === "string"
                              ? o.detay.videoBasligi
                              : null;
                          const secondary = videoBasligi ?? o.aciklama;
                          if (!secondary) return null;
                          return (
                            <div
                              className="mt-0.5 line-clamp-1 text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {secondary}
                            </div>
                          );
                        })()}
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-sm">{o.cari.unvan}</span>
                          {o.cari.tip === CariTipi.Harcama &&
                            o.cari.harcamaTuru && (
                              <span
                                className="inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                                style={{
                                  background: "var(--surface)",
                                  color: "var(--text-muted)",
                                  borderColor: "var(--border-strong)",
                                }}
                              >
                                {harcamaTuruEtiket[
                                  o.cari.harcamaTuru as HarcamaTuru
                                ] ?? o.cari.harcamaTuru}
                              </span>
                            )}
                        </div>
                        <div
                          className="font-mono text-[10px]"
                          style={{ color: "var(--text-soft)" }}
                        >
                          {o.cari.kod}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="tabular-nums">
                          {formatTarih(o.vadeTarihi)}
                        </div>
                        <div
                          className="text-xs"
                          style={{
                            color:
                              vade.durum === "gecikti"
                                ? "var(--negative)"
                                : vade.durum === "bugun"
                                ? "var(--warning)"
                                : "var(--text-soft)",
                          }}
                        >
                          {vade.metin}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatPara(tutar, o.paraBirimi)}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-semibold tabular-nums"
                        style={{
                          color: isAlacak
                            ? "var(--positive)"
                            : "var(--negative)",
                        }}
                      >
                        {formatPara(kalan, o.paraBirimi)}
                      </td>
                      <td className="px-4 py-3">
                        <DurumBadge durum={o.durum} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {!bitti && kalan > 0 && (
                            <button
                              onClick={() => setTahsilTarget(o)}
                              className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                              aria-label={labelEylem}
                              title={labelEylem}
                              style={{ color: "var(--positive)" }}
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => openDuzenle(o)}
                            className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                            aria-label="Düzenle"
                            title="Düzenle"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(o)}
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
            Toplam {items.length} kayıt
            {pending && " · güncelleniyor…"}
          </div>
        </div>
      )}

      <OdemeNotuDialog
        isOpen={dialogOpen}
        yon={yon}
        notu={editing}
        cariler={cariler}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={`"${deleteTarget?.baslik}" silinsin mi?`}
        description="Bu işlem geri alınamaz."
        confirmText="Sil"
        variant="danger"
        isLoading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
      />

      <ConfirmDialog
        isOpen={tahsilTarget !== null}
        title={
          isAlacak
            ? `"${tahsilTarget?.baslik}" tahsil edilsin mi?`
            : `"${tahsilTarget?.baslik}" ödendi olarak işaretlensin mi?`
        }
        description={
          tahsilTarget
            ? `Kalan ${formatPara(
                parseFloat(tahsilTarget.tutar) -
                  parseFloat(tahsilTarget.odenenTutar),
                tahsilTarget.paraBirimi,
              )} tutarında tek bir hareket kaydı oluşturulacak.`
            : ""
        }
        confirmText={labelEylem}
        variant="primary"
        isLoading={tahsiling}
        onCancel={() => setTahsilTarget(null)}
        onConfirm={onConfirmTahsil}
      />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        title={`${bulk.selectedCount} kayıt silinsin mi?`}
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

function KpiRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative" | "warning" | "neutral";
}) {
  const color = {
    positive: "var(--positive)",
    negative: "var(--negative)",
    warning: "var(--warning)",
    neutral: "var(--text)",
  }[tone];
  const bg = {
    positive: "var(--positive-soft)",
    negative: "var(--negative-soft)",
    warning: "var(--warning-soft)",
    neutral: "var(--surface)",
  }[tone];
  const border = {
    positive: "color-mix(in oklch, var(--positive) 25%, transparent)",
    negative: "color-mix(in oklch, var(--negative) 25%, transparent)",
    warning: "color-mix(in oklch, var(--warning) 25%, transparent)",
    neutral: "var(--border)",
  }[tone];
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: bg, borderColor: border }}
    >
      <div
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </div>
      <div
        className="mt-1 text-xl font-bold tabular-nums"
        style={{ color }}
      >
        {value}
      </div>
    </div>
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
      {odemeDurumuEtiket[durum as keyof typeof odemeDurumuEtiket] ?? durum}
    </span>
  );
}

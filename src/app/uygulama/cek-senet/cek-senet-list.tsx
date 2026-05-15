"use client";

import {
  useState,
  useTransition,
  useDeferredValue,
  useEffect,
  useRef,
} from "react";
import {
  useRouter,
  usePathname,
  useSearchParams,
} from "next/navigation";
import { Button } from "@heroui/react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  FileText,
  Banknote,
  CalendarClock,
  AlertOctagon,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { Select, TextInput } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  BulkActionBar,
  deleteBulkAction,
} from "@/components/ui/bulk-action-bar";
import { useBulkSelect } from "@/lib/hooks/use-bulk-select";
import { CekSenetDialog } from "./cek-senet-dialog";
import {
  bulkDeleteCekSenet,
  deleteCekSenet,
  updateCekSenetDurum,
} from "./actions";
import {
  CekSenetTip,
  CekSenetYon,
  CekSenetDurum,
  cekSenetTipEtiket,
  cekSenetYonEtiket,
  cekSenetDurumEtiket,
} from "@/lib/enums";
import { formatPara, formatTarih, formatVade } from "@/lib/format";

export interface CekSenetRow {
  id: number;
  cariId: number | null;
  tip: string;
  yon: string;
  durum: string;
  belgeNo: string;
  bankaAdi: string | null;
  sube: string | null;
  hesapNo: string | null;
  keside: string | null;
  tutar: string;
  paraBirimi: string;
  kesideTarihi: string;
  vadeTarihi: string;
  tahsilTarihi: string | null;
  aciklama: string | null;
  cari: { id: number; kod: string; unvan: string } | null;
}

export interface CariRef {
  id: number;
  kod: string;
  unvan: string;
}

export interface Istatistikler {
  bekleyenAlacak: string;
  bekleyenBorc: string;
  buAyVadeli: number;
  karsiliksiz: number;
}

interface Props {
  items: CekSenetRow[];
  cariler: CariRef[];
  istatistikler: Istatistikler;
  autoOpenYeni: boolean;
}

const DURUM_GECISLERI: Record<string, string[]> = {
  [CekSenetDurum.Portfoyde]: [
    CekSenetDurum.TahsileGonderildi,
    CekSenetDurum.Tahsil,
    CekSenetDurum.Iade,
    CekSenetDurum.Karsiliksiz,
    CekSenetDurum.Iptal,
  ],
  [CekSenetDurum.TahsileGonderildi]: [
    CekSenetDurum.Tahsil,
    CekSenetDurum.Portfoyde,
    CekSenetDurum.Karsiliksiz,
    CekSenetDurum.Iade,
  ],
  [CekSenetDurum.Tahsil]: [CekSenetDurum.Portfoyde],
  [CekSenetDurum.Iade]: [CekSenetDurum.Portfoyde],
  [CekSenetDurum.Karsiliksiz]: [CekSenetDurum.Portfoyde, CekSenetDurum.Iade],
  [CekSenetDurum.Iptal]: [CekSenetDurum.Portfoyde],
};

export function CekSenetList({
  items,
  cariler,
  istatistikler,
  autoOpenYeni,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  // URL filtreleri
  const tip = params.get("tip") ?? "";
  const yon = params.get("yon") ?? "";
  const durum = params.get("durum") ?? "";

  // Aranan metin
  const [localQ, setLocalQ] = useState(params.get("q") ?? "");
  const deferredQ = useDeferredValue(localQ);

  useEffect(() => {
    const url = new URLSearchParams(params.toString());
    if (deferredQ) url.set("q", deferredQ);
    else url.delete("q");
    startTransition(() => {
      router.replace(`${pathname}?${url.toString()}`, { scroll: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQ]);

  function setParam(key: string, value: string) {
    const url = new URLSearchParams(params.toString());
    if (value) url.set(key, value);
    else url.delete(key);
    startTransition(() => {
      router.replace(`${pathname}?${url.toString()}`, { scroll: false });
    });
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CekSenetRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CekSenetRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ?yeni=1 ile otomatik dialog aç (tek seferlik)
  const autoOpenRef = useRef(false);
  useEffect(() => {
    if (autoOpenYeni && !autoOpenRef.current) {
      autoOpenRef.current = true;
      setEditing(null);
      setDialogOpen(true);
      // URL'den yeni=1'i temizle
      const url = new URLSearchParams(params.toString());
      url.delete("yeni");
      router.replace(
        url.toString() ? `${pathname}?${url.toString()}` : pathname,
        { scroll: false },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenYeni]);

  // Bulk
  const bulk = useBulkSelect(items);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  async function onBulkDelete() {
    setBulkDeleting(true);
    const r = await bulkDeleteCekSenet(bulk.selectedIds as number[]);
    setBulkDeleting(false);
    if (r.ok) {
      toast.success(`${r.count} kayıt silindi`);
      bulk.clear();
      setBulkDeleteOpen(false);
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  function openYeni() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openDuzenle(c: CekSenetRow) {
    setEditing(c);
    setDialogOpen(true);
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await deleteCekSenet(deleteTarget.id);
    setDeleting(false);
    if (r.ok) {
      toast.success(`${deleteTarget.belgeNo} silindi`);
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  async function onDurumDegistir(c: CekSenetRow, yeniDurum: string) {
    const r = await updateCekSenetDurum(c.id, yeniDurum);
    if (r.ok) {
      const label =
        cekSenetDurumEtiket[
          yeniDurum as keyof typeof cekSenetDurumEtiket
        ] ?? yeniDurum;
      toast.success(`${c.belgeNo}: ${label}`);
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  const filtreVar = Boolean(localQ || tip || yon || durum);

  return (
    <>
      <PageHeader
        icon={<FileText size={20} />}
        title="Çek / Senet"
        subtitle="Alınan ve verilen çek-senetler, vade ve tahsilat takibi"
        actions={
          <Button variant="primary" size="md" onPress={openYeni}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Yeni Çek/Senet
            </span>
          </Button>
        }
      />

      {/* KPI kartları */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Bekleyen Alacak"
          value={formatPara(parseFloat(istatistikler.bekleyenAlacak))}
          hint="Alınan, portföyde + tahsilde"
          tone="positive"
          icon={<ArrowDownLeft size={18} />}
        />
        <StatCard
          label="Bekleyen Borç"
          value={formatPara(parseFloat(istatistikler.bekleyenBorc))}
          hint="Verilen, portföyde + tahsilde"
          tone="negative"
          icon={<ArrowUpRight size={18} />}
        />
        <StatCard
          label="Bu Ay Vadesi"
          value={String(istatistikler.buAyVadeli)}
          hint="Bu ay içinde vadesi dolan"
          tone={istatistikler.buAyVadeli > 0 ? "warning" : "neutral"}
          icon={<CalendarClock size={18} />}
        />
        <StatCard
          label="Karşılıksız"
          value={String(istatistikler.karsiliksiz)}
          hint="Karşılıksız işaretli"
          tone={istatistikler.karsiliksiz > 0 ? "negative" : "neutral"}
          icon={<AlertOctagon size={18} />}
        />
      </div>

      {/* Filtre çubuğu */}
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_140px_140px_180px]">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute top-3 left-3"
            style={{ color: "var(--text-soft)" }}
          />
          <TextInput
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder="Belge no, banka, profil, açıklama..."
            className="pl-9"
          />
        </div>
        <Select value={tip} onChange={(e) => setParam("tip", e.target.value)}>
          <option value="">Tüm Tipler</option>
          <option value={CekSenetTip.Cek}>{cekSenetTipEtiket.Cek}</option>
          <option value={CekSenetTip.Senet}>{cekSenetTipEtiket.Senet}</option>
        </Select>
        <Select value={yon} onChange={(e) => setParam("yon", e.target.value)}>
          <option value="">Tüm Yönler</option>
          <option value={CekSenetYon.Alinan}>
            {cekSenetYonEtiket.Alinan}
          </option>
          <option value={CekSenetYon.Verilen}>
            {cekSenetYonEtiket.Verilen}
          </option>
        </Select>
        <Select
          value={durum}
          onChange={(e) => setParam("durum", e.target.value)}
        >
          <option value="">Tüm Durumlar</option>
          <option value={CekSenetDurum.Portfoyde}>
            {cekSenetDurumEtiket.Portfoyde}
          </option>
          <option value={CekSenetDurum.TahsileGonderildi}>
            {cekSenetDurumEtiket.TahsileGonderildi}
          </option>
          <option value={CekSenetDurum.Tahsil}>
            {cekSenetDurumEtiket.Tahsil}
          </option>
          <option value={CekSenetDurum.Iade}>
            {cekSenetDurumEtiket.Iade}
          </option>
          <option value={CekSenetDurum.Karsiliksiz}>
            {cekSenetDurumEtiket.Karsiliksiz}
          </option>
          <option value={CekSenetDurum.Iptal}>
            {cekSenetDurumEtiket.Iptal}
          </option>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<FileText size={22} />}
          title={
            filtreVar ? "Eşleşen kayıt yok" : "Henüz çek / senet yok"
          }
          description={
            filtreVar
              ? "Filtreyi temizleyip tekrar deneyin"
              : "İlk çek veya senet kaydını ekleyin"
          }
          action={
            !filtreVar ? (
              <Button variant="primary" size="md" onPress={openYeni}>
                <span className="flex items-center gap-1.5">
                  <Plus size={16} /> Yeni Çek/Senet
                </span>
              </Button>
            ) : null
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
                        bulk.isAllSelected
                          ? bulk.clear()
                          : bulk.selectAll()
                      }
                      className="size-4 cursor-pointer rounded"
                      style={{ accentColor: "var(--accent)" }}
                      aria-label="Hepsini seç"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Tip / Yön</th>
                  <th className="px-4 py-3 font-medium">Belge No</th>
                  <th className="px-4 py-3 font-medium">Profil</th>
                  <th className="px-4 py-3 font-medium">Banka</th>
                  <th className="px-4 py-3 text-right font-medium">Tutar</th>
                  <th className="px-4 py-3 font-medium">Vade</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c, i) => {
                  const vade = formatVade(c.vadeTarihi);
                  const isAlinan = c.yon === CekSenetYon.Alinan;
                  const isCek = c.tip === CekSenetTip.Cek;
                  const aktifDurum =
                    c.durum === CekSenetDurum.Portfoyde ||
                    c.durum === CekSenetDurum.TahsileGonderildi;
                  const vadesiGecti =
                    aktifDurum && vade.durum === "gecikti";

                  return (
                    <tr
                      key={c.id}
                      className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                      style={{
                        borderTop:
                          i === 0 ? "none" : "1px solid var(--border)",
                        background: bulk.isSelected(c.id)
                          ? "var(--surface-muted)"
                          : vadesiGecti
                          ? "color-mix(in oklch, var(--negative) 7%, transparent)"
                          : undefined,
                      }}
                    >
                      <td className="w-8 px-2 py-3">
                        <input
                          type="checkbox"
                          checked={bulk.isSelected(c.id)}
                          onChange={() => bulk.toggle(c.id)}
                          className="size-4 cursor-pointer rounded"
                          style={{ accentColor: "var(--accent)" }}
                          aria-label={`${c.belgeNo} seç`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={{
                              background: isCek
                                ? "var(--brand-soft)"
                                : "var(--surface-muted)",
                              color: isCek
                                ? "var(--brand)"
                                : "var(--text-muted)",
                            }}
                          >
                            {isCek ? (
                              <Banknote size={11} />
                            ) : (
                              <FileText size={11} />
                            )}
                            {
                              cekSenetTipEtiket[
                                c.tip as keyof typeof cekSenetTipEtiket
                              ]
                            }
                          </span>
                          <span
                            className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={{
                              background: isAlinan
                                ? "var(--positive-soft)"
                                : "var(--negative-soft)",
                              color: isAlinan
                                ? "var(--positive)"
                                : "var(--negative)",
                            }}
                          >
                            {isAlinan ? (
                              <ArrowDownLeft size={11} />
                            ) : (
                              <ArrowUpRight size={11} />
                            )}
                            {
                              cekSenetYonEtiket[
                                c.yon as keyof typeof cekSenetYonEtiket
                              ]
                            }
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">
                        {c.belgeNo}
                      </td>
                      <td className="px-4 py-3">
                        {c.cari ? (
                          <>
                            <div className="text-sm">{c.cari.unvan}</div>
                            <div
                              className="font-mono text-[10px]"
                              style={{ color: "var(--text-soft)" }}
                            >
                              {c.cari.kod}
                            </div>
                          </>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-soft)" }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.bankaAdi ? (
                          <>
                            <div className="text-sm">{c.bankaAdi}</div>
                            {c.sube && (
                              <div
                                className="text-[10px]"
                                style={{ color: "var(--text-soft)" }}
                              >
                                {c.sube}
                              </div>
                            )}
                          </>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-soft)" }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-semibold tabular-nums"
                        style={{
                          color: isAlinan
                            ? "var(--positive)"
                            : "var(--negative)",
                        }}
                      >
                        {formatPara(parseFloat(c.tutar), c.paraBirimi)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="tabular-nums">
                          {formatTarih(c.vadeTarihi)}
                        </div>
                        {aktifDurum && (
                          <div
                            className="text-xs"
                            style={{
                              color:
                                vade.durum === "gecikti"
                                  ? "var(--negative)"
                                  : vade.durum === "bugun"
                                  ? "var(--warning)"
                                  : vade.durum === "yakin"
                                  ? "var(--warning)"
                                  : "var(--text-soft)",
                              fontWeight:
                                vade.durum === "gecikti" ||
                                vade.durum === "bugun"
                                  ? 500
                                  : 400,
                            }}
                          >
                            {vade.metin}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <DurumBadge durum={c.durum} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <DurumDropdown
                            durum={c.durum}
                            onSelect={(d) => onDurumDegistir(c, d)}
                          />
                          <button
                            onClick={() => openDuzenle(c)}
                            className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                            aria-label="Düzenle"
                            title="Düzenle"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
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

      <CekSenetDialog
        isOpen={dialogOpen}
        editing={editing}
        cariler={cariler}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={`"${deleteTarget?.belgeNo}" silinsin mi?`}
        description="Bu işlem geri alınamaz."
        confirmText="Sil"
        variant="danger"
        isLoading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
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

function DurumBadge({ durum }: { durum: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    Portfoyde: {
      bg: "var(--surface-muted)",
      color: "var(--text-muted)",
    },
    TahsileGonderildi: {
      bg: "var(--brand-soft)",
      color: "var(--brand)",
    },
    Tahsil: {
      bg: "var(--positive-soft)",
      color: "var(--positive)",
    },
    Iade: {
      bg: "var(--warning-soft)",
      color: "var(--warning)",
    },
    Karsiliksiz: {
      bg: "var(--negative-soft)",
      color: "var(--negative)",
    },
    Iptal: {
      bg: "var(--surface-muted)",
      color: "var(--text-soft)",
    },
  };
  const s = styles[durum] ?? styles.Portfoyde;
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {cekSenetDurumEtiket[durum as keyof typeof cekSenetDurumEtiket] ?? durum}
    </span>
  );
}

function DurumDropdown({
  durum,
  onSelect,
}: {
  durum: string;
  onSelect: (yeniDurum: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const gecisler = DURUM_GECISLERI[durum] ?? [];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        !triggerRef.current?.contains(t) &&
        !menuRef.current?.contains(t)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (gecisler.length === 0) return null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-0.5 rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
        aria-label="Durum değiştir"
        title="Durum değiştir"
        style={{ color: "var(--brand)" }}
      >
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute top-full right-0 z-30 mt-1 w-56 overflow-hidden rounded-lg border shadow-xl"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div
            className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"
            style={{
              color: "var(--text-soft)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            Durumu değiştir
          </div>
          <ul>
            {gecisler.map((g) => (
              <li key={g}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSelect(g);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  style={{ color: "var(--text)" }}
                >
                  {
                    cekSenetDurumEtiket[
                      g as keyof typeof cekSenetDurumEtiket
                    ]
                  }
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

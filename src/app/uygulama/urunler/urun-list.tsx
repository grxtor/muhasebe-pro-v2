"use client";

import { useState, useTransition, useDeferredValue, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Search,
  AlertCircle,
  TrendingDown,
  Boxes,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, TextInput } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatCard } from "@/components/ui/stat-card";
import { UrunDialog } from "./urun-dialog";
import { StokHareketDialog } from "./stok-hareket-dialog";
import { deleteUrun } from "./actions";
import { formatPara } from "@/lib/format";

export interface UrunRow {
  id: number;
  kod: string;
  ad: string;
  aciklama: string | null;
  birim: string;
  satisFiyati: string;
  alisFiyati: string | null;
  kdvOrani: string;
  paraBirimi: string;
  stok: string;
  minStok: string;
  kategori: string | null;
  barkod: string | null;
  aktif: boolean;
}

interface Props {
  items: UrunRow[];
  kategoriler: string[];
  stats: { toplamUrun: number; dusukStok: number; toplamDeger: number };
  sonrakiKod: string;
}

export function UrunList({ items, kategoriler, stats, sonrakiKod }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [localQ, setLocalQ] = useState(params.get("q") ?? "");
  const deferredQ = useDeferredValue(localQ);
  const kategori = params.get("kategori") ?? "";
  const durum = params.get("durum") ?? "";

  useEffect(() => {
    const url = new URLSearchParams(params.toString());
    if (deferredQ) url.set("q", deferredQ);
    else url.delete("q");
    startTransition(() => {
      router.replace(`/uygulama/urunler?${url.toString()}`, { scroll: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQ]);

  function setParam(key: string, value: string) {
    const url = new URLSearchParams(params.toString());
    if (value) url.set(key, value);
    else url.delete(key);
    startTransition(() => {
      router.replace(`/uygulama/urunler?${url.toString()}`, { scroll: false });
    });
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UrunRow | null>(null);
  const [stokDialog, setStokDialog] = useState<UrunRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UrunRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openYeni() {
    setEditing(null);
    setDialogOpen(true);
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await deleteUrun(deleteTarget.id);
    setDeleting(false);
    if (r.ok) {
      toast.success(`${deleteTarget.ad} silindi`);
      setDeleteTarget(null);
      router.refresh();
    } else toast.error(r.error);
  }

  return (
    <>
      <PageHeader
        icon={<Package size={20} />}
        title="Ürünler / Stok"
        subtitle="Ürün katalogu, fiyatlar ve stok seviyeleri"
        actions={
          <Button variant="primary" size="md" onPress={openYeni}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Yeni Ürün
            </span>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Aktif Ürün"
          value={String(stats.toplamUrun)}
          tone="neutral"
          icon={<Boxes size={18} />}
        />
        <StatCard
          label="Düşük Stok"
          value={String(stats.dusukStok)}
          hint="min stok altında"
          tone={stats.dusukStok > 0 ? "warning" : "neutral"}
          icon={<TrendingDown size={18} />}
        />
        <StatCard
          label="Stok Değeri"
          value={formatPara(stats.toplamDeger)}
          hint="satış fiyatıyla"
          tone="positive"
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
            placeholder="Ad, kod, barkod..."
            className="pl-9"
          />
        </div>
        <Select
          value={kategori}
          onChange={(e) => setParam("kategori", e.target.value)}
        >
          <option value="">Tüm Kategoriler</option>
          {kategoriler.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
        <Select value={durum} onChange={(e) => setParam("durum", e.target.value)}>
          <option value="">Tüm Durumlar</option>
          <option value="aktif">Sadece Aktif</option>
          <option value="azalan">Stok Azalan</option>
          <option value="pasif">Pasif</option>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Package size={22} />}
          title={localQ || kategori || durum ? "Eşleşen ürün yok" : "Henüz ürün yok"}
          description="İlk ürününüzü ekleyerek katalog oluşturmaya başlayın"
          action={
            <Button variant="primary" size="md" onPress={openYeni}>
              <span className="flex items-center gap-1.5">
                <Plus size={16} /> Yeni Ürün
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
                  <th className="px-4 py-3 font-medium">Kod</th>
                  <th className="px-4 py-3 font-medium">Ad</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 text-right font-medium">Stok</th>
                  <th className="px-4 py-3 text-right font-medium">Satış</th>
                  <th className="px-4 py-3 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u, i) => {
                  const stok = parseFloat(u.stok);
                  const minStok = parseFloat(u.minStok);
                  const dusuk = u.aktif && stok <= minStok;
                  return (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                      style={{
                        borderTop:
                          i === 0 ? "none" : "1px solid var(--border)",
                        opacity: u.aktif ? 1 : 0.5,
                      }}
                    >
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {u.kod}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.ad}</div>
                        {u.barkod && (
                          <div
                            className="font-mono text-[10px]"
                            style={{ color: "var(--text-soft)" }}
                          >
                            {u.barkod}
                          </div>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {u.kategori ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div
                          className="font-semibold tabular-nums"
                          style={{
                            color: dusuk ? "var(--warning)" : "var(--text)",
                          }}
                        >
                          {stok} {u.birim}
                          {dusuk && (
                            <AlertCircle
                              size={12}
                              className="ml-1 inline"
                              style={{ color: "var(--warning)" }}
                            />
                          )}
                        </div>
                        {minStok > 0 && (
                          <div
                            className="text-[10px]"
                            style={{ color: "var(--text-soft)" }}
                          >
                            min {minStok}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <div className="font-semibold">
                          {formatPara(
                            parseFloat(u.satisFiyati),
                            u.paraBirimi,
                          )}
                        </div>
                        <div
                          className="text-[10px]"
                          style={{ color: "var(--text-soft)" }}
                        >
                          +%{parseFloat(u.kdvOrani)} KDV
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setStokDialog(u)}
                            className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                            aria-label="Stok hareketi"
                            title="Stok Giriş/Çıkış"
                            style={{ color: "var(--brand)" }}
                          >
                            <ArrowUpDown size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setEditing(u);
                              setDialogOpen(true);
                            }}
                            className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                            aria-label="Düzenle"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                            aria-label="Sil"
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
            Toplam {items.length} ürün
            {pending && " · güncelleniyor…"}
          </div>
        </div>
      )}

      <UrunDialog
        isOpen={dialogOpen}
        editing={editing}
        kategoriler={kategoriler}
        sonrakiKod={sonrakiKod}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          router.refresh();
        }}
      />

      <StokHareketDialog
        urun={stokDialog}
        onClose={() => setStokDialog(null)}
        onSaved={() => {
          setStokDialog(null);
          router.refresh();
        }}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={`"${deleteTarget?.ad}" silinsin mi?`}
        description="Bu işlem geri alınamaz. Ürünün tüm stok hareketleri de silinir."
        confirmText="Sil"
        variant="danger"
        isLoading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}

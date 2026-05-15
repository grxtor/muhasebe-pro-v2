"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@heroui/react";
import {
  Wallet,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/form-field";
import { HareketDialog, type KasaOption } from "../hareket-dialog";
import { deleteKasaHareketi } from "../actions";
import { KasaHareketTip, kasaHareketTipEtiket } from "@/lib/enums";
import { formatPara, formatTarih } from "@/lib/format";

export interface KasaDetayHareket {
  id: number;
  tip: string;
  yon: "giris" | "cikis";
  tutar: string;
  paraBirimi: string;
  tarih: string;
  aciklama: string | null;
  belgeNo: string | null;
  hedefKasaId: number | null;
}

interface Props {
  kasa: {
    id: number;
    ad: string;
    paraBirimi: string;
    acilis: string;
    aktif: boolean;
    varsayilan: boolean;
    aciklama: string | null;
    bakiye: string;
    toplamGiris: string;
    toplamCikis: string;
  };
  hareketler: KasaDetayHareket[];
  aktifKasalar: KasaOption[];
  aralik: string;
}

export function KasaDetay({ kasa, hareketler, aktifKasalar, aralik }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hareketOpen, setHareketOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KasaDetayHareket | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const bakiye = parseFloat(kasa.bakiye);
  const toplamGiris = parseFloat(kasa.toplamGiris);
  const toplamCikis = parseFloat(kasa.toplamCikis);

  function changeAralik(value: string) {
    const url = new URLSearchParams();
    if (value && value !== "30") url.set("aralik", value);
    startTransition(() => {
      router.replace(
        `/uygulama/kasa/${kasa.id}${url.toString() ? `?${url.toString()}` : ""}`,
        { scroll: false },
      );
    });
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await deleteKasaHareketi(deleteTarget.id);
    setDeleting(false);
    if (r.ok) {
      toast.success("Hareket silindi");
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  const aralikLabels: Record<string, string> = {
    "30": "Son 30 gün",
    "90": "Son 90 gün",
    all: "Tüm hareketler",
  };

  return (
    <>
      <div
        className="mb-2 inline-flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        <Link
          href="/uygulama/kasa"
          className="inline-flex items-center gap-1 hover:underline"
        >
          <ArrowLeft size={14} /> Kasalar
        </Link>
      </div>

      <PageHeader
        icon={<Wallet size={20} />}
        title={kasa.ad}
        subtitle={[
          kasa.paraBirimi,
          kasa.varsayilan ? "Varsayılan" : null,
          !kasa.aktif ? "Pasif" : null,
          kasa.aciklama ?? null,
        ]
          .filter((s): s is string => Boolean(s))
          .join(" · ")}
        actions={
          <Button
            variant="primary"
            size="md"
            onPress={() => setHareketOpen(true)}
            isDisabled={!kasa.aktif}
          >
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Hareket Ekle
            </span>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <StatCard
          label="Mevcut Bakiye"
          value={formatPara(bakiye, kasa.paraBirimi)}
          tone={bakiye >= 0 ? "positive" : "negative"}
          icon={<Coins size={18} />}
        />
        <StatCard
          label="Açılış Bakiyesi"
          value={formatPara(parseFloat(kasa.acilis), kasa.paraBirimi)}
          tone="neutral"
        />
        <StatCard
          label="Toplam Giriş"
          value={formatPara(toplamGiris, kasa.paraBirimi)}
          tone="positive"
          icon={<ArrowDownLeft size={18} />}
        />
        <StatCard
          label="Toplam Çıkış"
          value={formatPara(toplamCikis, kasa.paraBirimi)}
          tone="negative"
          icon={<ArrowUpRight size={18} />}
        />
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_220px]">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Hareket Geçmişi</h2>
          <span
            className="text-xs"
            style={{ color: "var(--text-soft)" }}
          >
            ({aralikLabels[aralik] ?? aralikLabels["30"]})
          </span>
        </div>
        <Select
          value={aralik}
          onChange={(e) => changeAralik(e.target.value)}
          aria-label="Tarih aralığı"
        >
          <option value="30">Son 30 gün</option>
          <option value="90">Son 90 gün</option>
          <option value="all">Tüm hareketler</option>
        </Select>
      </div>

      {hareketler.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight size={22} />}
          title="Bu aralıkta hareket yok"
          description="Hareket eklediğinizde burada görünecek."
          action={
            <Button
              variant="primary"
              size="md"
              onPress={() => setHareketOpen(true)}
              isDisabled={!kasa.aktif}
            >
              <span className="flex items-center gap-1.5">
                <Plus size={16} /> Hareket Ekle
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
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 font-medium">Tip</th>
                  <th className="px-4 py-3 font-medium">Açıklama</th>
                  <th className="px-4 py-3 font-medium">Belge No</th>
                  <th className="px-4 py-3 text-right font-medium">Tutar</th>
                  <th className="w-12 px-2 py-3 text-center font-medium">
                    <span className="sr-only">Sil</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {hareketler.map((h, i) => {
                  const isGiris = h.yon === "giris";
                  const tipKey = h.tip as keyof typeof kasaHareketTipEtiket;
                  const tipLabel = kasaHareketTipEtiket[tipKey] ?? h.tip;
                  return (
                    <tr
                      key={h.id}
                      className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                      style={{
                        borderTop:
                          i === 0 ? "none" : "1px solid var(--border)",
                      }}
                    >
                      <td
                        className="px-4 py-3 tabular-nums"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatTarih(h.tarih)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: isGiris
                              ? "var(--positive-soft)"
                              : "var(--negative-soft)",
                            color: isGiris
                              ? "var(--positive)"
                              : "var(--negative)",
                          }}
                        >
                          {h.tip === KasaHareketTip.Transfer ? (
                            <ArrowLeftRight size={11} />
                          ) : isGiris ? (
                            <ArrowDownLeft size={11} />
                          ) : (
                            <ArrowUpRight size={11} />
                          )}
                          {tipLabel}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {h.aciklama || "—"}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: "var(--text-soft)" }}
                      >
                        {h.belgeNo || "—"}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-semibold tabular-nums"
                        style={{
                          color: isGiris
                            ? "var(--positive)"
                            : "var(--negative)",
                        }}
                      >
                        {isGiris ? "+" : "−"}
                        {formatPara(parseFloat(h.tutar), h.paraBirimi)}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(h)}
                          className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                          style={{ color: "var(--negative)" }}
                          aria-label="Sil"
                          title="Hareketi sil"
                        >
                          <Trash2 size={14} />
                        </button>
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
            Son {hareketler.length} hareket
            {pending && " · güncelleniyor…"}
          </div>
        </div>
      )}

      <HareketDialog
        kasalar={aktifKasalar}
        defaultKasaId={hareketOpen ? kasa.id : null}
        onClose={() => setHareketOpen(false)}
        onSaved={() => {
          setHareketOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Hareket silinsin mi?"
        description={
          deleteTarget?.tip === KasaHareketTip.Transfer
            ? "Bu bir transfer hareketidir. Karşı kasadaki eş kaydı da otomatik silinecek."
            : "Bu işlem geri alınamaz."
        }
        confirmText="Sil"
        variant="danger"
        isLoading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import {
  Plus,
  Pencil,
  Trash2,
  Repeat,
  Play,
  Pause,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TekrarlayanDialog } from "./tekrarlayan-dialog";
import {
  deleteTekrarlayan,
  generateNext,
  toggleAktif,
} from "./actions";
import {
  TekrarTip,
  tekrarTipEtiket,
  tekrarSiklikEtiket,
  OdemeYonu,
  odemeYonuEtiket,
} from "@/lib/enums";
import { formatPara, formatTarih, formatVade } from "@/lib/format";

export interface TekrarlayanRow {
  id: number;
  ad: string;
  tip: string;
  cariId: number;
  yon: string;
  tutar: string;
  kdvOrani: string;
  paraBirimi: string;
  aciklama: string | null;
  vadeGun: number;
  siklik: string;
  baslangicTarihi: string;
  sonrakiTarih: string;
  bitisTarihi: string | null;
  uretilenAdet: number;
  aktif: boolean;
  cari: { id: number; kod: string; unvan: string } | null;
}

export interface CariRef {
  id: number;
  kod: string;
  unvan: string;
}

export function TekrarlayanList({
  items,
  cariler,
}: {
  items: TekrarlayanRow[];
  cariler: CariRef[];
}) {
  const router = useRouter();
  const [pendingAction, startAction] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TekrarlayanRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TekrarlayanRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openYeni() {
    setEditing(null);
    setDialogOpen(true);
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await deleteTekrarlayan(deleteTarget.id);
    setDeleting(false);
    if (r.ok) {
      toast.success("Tekrarlayan kayıt silindi");
      setDeleteTarget(null);
      router.refresh();
    } else toast.error(r.error);
  }

  async function onGenerate(t: TekrarlayanRow) {
    startAction(async () => {
      const r = await generateNext(t.id);
      if (r.ok) {
        toast.success(
          t.tip === TekrarTip.Fatura
            ? "Fatura üretildi"
            : "Alacak/borç kaydı üretildi",
        );
        router.refresh();
      } else toast.error(r.error);
    });
  }

  async function onToggle(t: TekrarlayanRow) {
    startAction(async () => {
      const r = await toggleAktif(t.id, !t.aktif);
      if (r.ok) {
        toast.success(t.aktif ? "Duraklatıldı" : "Aktif edildi");
        router.refresh();
      }
    });
  }

  return (
    <>
      <PageHeader
        icon={<Repeat size={20} />}
        title="Tekrarlayan Kayıtlar"
        subtitle="Kira, abonelik, düzenli ödemeler — şablondan otomatik üretim"
        actions={
          <Button variant="primary" size="md" onPress={openYeni}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Yeni Şablon
            </span>
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Repeat size={22} />}
          title="Henüz tekrarlayan kayıt yok"
          description="Düzenli faturalar veya ödemeler için şablon oluşturun (örn: ofis kirası, internet aboneliği)"
          action={
            <Button variant="primary" size="md" onPress={openYeni}>
              <span className="flex items-center gap-1.5">
                <Plus size={16} /> Yeni Şablon
              </span>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((t) => {
            const vade = formatVade(t.sonrakiTarih);
            const isAlacak = t.yon === OdemeYonu.Alacak;
            return (
              <div
                key={t.id}
                className="rounded-xl border p-4"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  opacity: t.aktif ? 1 : 0.6,
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">{t.ad}</h3>
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          background: isAlacak
                            ? "var(--positive-soft)"
                            : "var(--negative-soft)",
                          color: isAlacak
                            ? "var(--positive)"
                            : "var(--negative)",
                        }}
                      >
                        {tekrarTipEtiket[t.tip as keyof typeof tekrarTipEtiket]}{" "}
                        ·{" "}
                        {odemeYonuEtiket[t.yon as keyof typeof odemeYonuEtiket]}
                      </span>
                      {!t.aktif && (
                        <span
                          className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            background: "var(--surface-muted)",
                            color: "var(--text-muted)",
                          }}
                        >
                          Duraklatıldı
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span>
                        {t.cari?.unvan} · {t.cari?.kod}
                      </span>
                      <span>
                        ↻ {tekrarSiklikEtiket[
                          t.siklik as keyof typeof tekrarSiklikEtiket
                        ]}
                      </span>
                      <span>{t.uretilenAdet} kayıt üretildi</span>
                    </div>
                    {t.aciklama && (
                      <p
                        className="mt-1.5 text-sm"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {t.aciklama}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div
                      className="text-lg font-bold tabular-nums"
                      style={{
                        color: isAlacak
                          ? "var(--positive)"
                          : "var(--negative)",
                      }}
                    >
                      {formatPara(parseFloat(t.tutar), t.paraBirimi)}
                    </div>
                    <div
                      className="text-[11px]"
                      style={{ color: "var(--text-soft)" }}
                    >
                      +%{parseFloat(t.kdvOrani)} KDV
                    </div>
                  </div>
                </div>

                <div
                  className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="text-xs">
                    <span style={{ color: "var(--text-muted)" }}>
                      Sıradaki:{" "}
                    </span>
                    <span className="font-medium">
                      {formatTarih(t.sonrakiTarih)}
                    </span>
                    {t.aktif && (
                      <span
                        className="ml-1"
                        style={{
                          color:
                            vade.durum === "gecikti"
                              ? "var(--negative)"
                              : vade.durum === "bugun"
                              ? "var(--warning)"
                              : "var(--text-soft)",
                        }}
                      >
                        ({vade.metin})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="primary"
                      size="sm"
                      isDisabled={!t.aktif || pendingAction}
                      onPress={() => onGenerate(t)}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Zap size={13} /> Şimdi Üret
                      </span>
                    </Button>
                    <button
                      onClick={() => onToggle(t)}
                      disabled={pendingAction}
                      className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                      style={{ color: "var(--text-muted)" }}
                      aria-label={t.aktif ? "Duraklat" : "Aktif Et"}
                      title={t.aktif ? "Duraklat" : "Aktif Et"}
                    >
                      {t.aktif ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(t);
                        setDialogOpen(true);
                      }}
                      className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                      style={{ color: "var(--text-muted)" }}
                      aria-label="Düzenle"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                      style={{ color: "var(--negative)" }}
                      aria-label="Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TekrarlayanDialog
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
        title={`"${deleteTarget?.ad}" silinsin mi?`}
        description="Şablon silinir. Daha önce üretilen faturalar / alacaklar etkilenmez."
        confirmText="Sil"
        variant="danger"
        isLoading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@heroui/react";
import {
  Plus,
  Trash2,
  BarChart3,
  Music2,
  Wallet,
  CalendarRange,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UploadDialog } from "./upload-dialog";
import { deleteDistributorRapor } from "./actions";
import { formatPara, formatTarih } from "@/lib/format";

export interface DistributorRow {
  id: number;
  ad: string;
  platform: string | null;
  donem: string;
  dosyaAdi: string | null;
  toplamGelir: string;
  paraBirimi: string;
  toplamStream: number;
  satirSayisi: number;
  olusturmaTarihi: string;
}

export interface Istatistikler {
  toplamRapor: number;
  toplamGelir: string;
  buAyGelir: string;
}

interface Props {
  items: DistributorRow[];
  istatistikler: Istatistikler;
  autoOpenYeni: boolean;
}

const PLATFORM_STYLES: Record<string, { bg: string; color: string }> = {
  Spotify: { bg: "var(--positive-soft)", color: "var(--positive)" },
  YouTube: { bg: "var(--negative-soft)", color: "var(--negative)" },
  "Apple Music": { bg: "var(--brand-soft)", color: "var(--brand)" },
  Diğer: { bg: "var(--surface-muted)", color: "var(--text-muted)" },
};

export function DistributorList({ items, istatistikler, autoOpenYeni }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DistributorRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const autoOpenRef = useRef(false);
  useEffect(() => {
    if (autoOpenYeni && !autoOpenRef.current) {
      autoOpenRef.current = true;
      setDialogOpen(true);
    }
  }, [autoOpenYeni]);

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await deleteDistributorRapor(deleteTarget.id);
    setDeleting(false);
    if (r.ok) {
      toast.success(`${deleteTarget.ad} silindi`);
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  return (
    <>
      <PageHeader
        icon={<BarChart3 size={20} />}
        title="Distribütör Raporları"
        subtitle="Spotify, YouTube ve Apple Music gibi platformların gelir raporları"
        actions={
          <Button
            variant="primary"
            size="md"
            onPress={() => setDialogOpen(true)}
          >
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Yeni Rapor Yükle
            </span>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Toplam Rapor"
          value={String(istatistikler.toplamRapor)}
          hint="Tüm dönemler"
          tone="neutral"
          icon={<BarChart3 size={18} />}
        />
        <StatCard
          label="Toplam Gelir"
          value={formatPara(parseFloat(istatistikler.toplamGelir))}
          hint="Tüm raporların toplamı"
          tone="positive"
          icon={<Wallet size={18} />}
        />
        <StatCard
          label="Bu Ay"
          value={formatPara(parseFloat(istatistikler.buAyGelir))}
          hint="Bu döneme ait raporlar"
          tone={
            parseFloat(istatistikler.buAyGelir) > 0 ? "positive" : "neutral"
          }
          icon={<CalendarRange size={18} />}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Music2 size={22} />}
          title="Henüz rapor yok"
          description="Spotify, YouTube ya da Apple Music CSV'ni yükle, otomatik gelir hesaplansın."
          action={
            <Button
              variant="primary"
              size="md"
              onPress={() => setDialogOpen(true)}
            >
              <span className="flex items-center gap-1.5">
                <Plus size={16} /> Yeni Rapor Yükle
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
                  <th className="px-4 py-3 font-medium">Ad</th>
                  <th className="px-4 py-3 font-medium">Platform</th>
                  <th className="px-4 py-3 font-medium">Dönem</th>
                  <th className="px-4 py-3 text-right font-medium">Satır</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Toplam Gelir
                  </th>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, i) => {
                  const platform = r.platform ?? "Diğer";
                  const style = PLATFORM_STYLES[platform] ?? PLATFORM_STYLES.Diğer;
                  return (
                    <tr
                      key={r.id}
                      className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                      style={{
                        borderTop:
                          i === 0 ? "none" : "1px solid var(--border)",
                      }}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/uygulama/distributor/${r.id}`}
                          className="font-medium hover:underline"
                          style={{ color: "var(--text)" }}
                        >
                          {r.ad}
                        </Link>
                        {r.dosyaAdi && (
                          <div
                            className="text-[10px]"
                            style={{ color: "var(--text-soft)" }}
                          >
                            {r.dosyaAdi}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{ background: style.bg, color: style.color }}
                        >
                          <Music2 size={11} />
                          {platform}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {r.donem}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.satirSayisi.toLocaleString("tr-TR")}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-semibold tabular-nums"
                        style={{ color: "var(--positive)" }}
                      >
                        {formatPara(parseFloat(r.toplamGelir), r.paraBirimi)}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums">
                        {formatTarih(r.olusturmaTarihi)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                          aria-label="Sil"
                          title="Sil"
                          style={{ color: "var(--negative)" }}
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
            Toplam {items.length} rapor
          </div>
        </div>
      )}

      <UploadDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={(raporId) => {
          setDialogOpen(false);
          router.push(`/uygulama/distributor/${raporId}`);
        }}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={`"${deleteTarget?.ad}" silinsin mi?`}
        description="Rapor ve bağlı promosyon eşleştirmeleri silinir. Bu işlem geri alınamaz."
        confirmText="Sil"
        variant="danger"
        isLoading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}

"use client";

import { useState, useDeferredValue, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";
import {
  Search,
  ListOrdered,
  ArrowDownLeft,
  ArrowUpRight,
  Paperclip,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { Select, TextInput } from "@/components/ui/form-field";
import { DataModal } from "@/components/ui/data-modal";
import { DekontList } from "@/components/ui/dekont-list";
import { HareketTipi, hareketTipiEtiket } from "@/lib/enums";
import { formatPara, formatTarih } from "@/lib/format";
import { downloadExcel } from "@/lib/excel";
import { exportHareketler } from "./actions";

export interface HareketRow {
  id: number;
  cariId: number;
  tarih: string;
  tip: string;
  tutar: string;
  paraBirimi: string;
  aciklama: string | null;
  belgeNo: string | null;
  cari: { kod: string; unvan: string };
}

interface Props {
  items: HareketRow[];
  toplamAlacak: string;
  toplamBorc: string;
}

export function HareketList({ items, toplamAlacak, toplamBorc }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [localQ, setLocalQ] = useState(params.get("q") ?? "");
  const deferredQ = useDeferredValue(localQ);
  const tip = params.get("tip") ?? "";

  // Dekont modal state
  const [dekontHareket, setDekontHareket] = useState<HareketRow | null>(null);

  // Excel export
  const [exporting, setExporting] = useState(false);
  async function handleExport() {
    setExporting(true);
    try {
      const { rows } = await exportHareketler({
        tip: tip || undefined,
        q: localQ || undefined,
      });
      if (rows.length === 0) {
        toast.warning("Dışa aktarılacak hareket yok");
        return;
      }
      const tarih = new Date().toISOString().slice(0, 10);
      downloadExcel(rows, "Hareketler", `hareketler-${tarih}.xlsx`);
      toast.success(`${rows.length} hareket dışa aktarıldı`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      toast.error(`Dışa aktarım başarısız: ${msg}`);
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    const url = new URLSearchParams(params.toString());
    if (deferredQ) url.set("q", deferredQ);
    else url.delete("q");
    startTransition(() => {
      router.replace(`/uygulama/hareketler?${url.toString()}`, { scroll: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQ]);

  function changeTip(value: string) {
    const url = new URLSearchParams(params.toString());
    if (value) url.set("tip", value);
    else url.delete("tip");
    startTransition(() => {
      router.replace(`/uygulama/hareketler?${url.toString()}`, { scroll: false });
    });
  }

  const net = parseFloat(toplamAlacak) - parseFloat(toplamBorc);

  return (
    <>
      <PageHeader
        icon={<ListOrdered size={20} />}
        title="Hareketler"
        subtitle="Tahsilat ve ödemelerinizden oluşan zaman çizelgesi"
        actions={
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
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Toplam Tahsilat"
          value={formatPara(parseFloat(toplamAlacak))}
          tone="positive"
          icon={<ArrowDownLeft size={18} />}
        />
        <StatCard
          label="Toplam Ödeme"
          value={formatPara(parseFloat(toplamBorc))}
          tone="negative"
          icon={<ArrowUpRight size={18} />}
        />
        <StatCard
          label="Net"
          value={formatPara(net)}
          tone={net >= 0 ? "positive" : "negative"}
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
            placeholder="Profil, açıklama, belge no..."
            className="pl-9"
          />
        </div>
        <Select value={tip} onChange={(e) => changeTip(e.target.value)}>
          <option value="">Tüm tipler</option>
          <option value={HareketTipi.Alacak}>
            {hareketTipiEtiket.Alacak}
          </option>
          <option value={HareketTipi.Borc}>{hareketTipiEtiket.Borc}</option>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<ListOrdered size={22} />}
          title="Hareket yok"
          description="Bir alacak veya borç tahsil ettiğinizde burada görünecek."
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
                  <th className="px-4 py-3 font-medium">Profil</th>
                  <th className="px-4 py-3 font-medium">Açıklama</th>
                  <th className="px-4 py-3 font-medium">Tip</th>
                  <th className="px-4 py-3 text-right font-medium">Tutar</th>
                  <th className="w-12 px-2 py-3 text-center font-medium">
                    <span className="sr-only">Dekont</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((h, i) => {
                  const isAlacak = h.tip === HareketTipi.Alacak;
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
                      <td className="px-4 py-3">{h.cari.unvan}</td>
                      <td
                        className="px-4 py-3"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {h.aciklama || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: isAlacak
                              ? "var(--positive-soft)"
                              : "var(--negative-soft)",
                            color: isAlacak
                              ? "var(--positive)"
                              : "var(--negative)",
                          }}
                        >
                          {isAlacak ? (
                            <ArrowDownLeft size={11} />
                          ) : (
                            <ArrowUpRight size={11} />
                          )}
                          {hareketTipiEtiket[
                            h.tip as keyof typeof hareketTipiEtiket
                          ] ?? h.tip}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-right font-semibold tabular-nums"
                        style={{
                          color: isAlacak
                            ? "var(--positive)"
                            : "var(--negative)",
                        }}
                      >
                        {isAlacak ? "+" : "−"}
                        {formatPara(parseFloat(h.tutar), h.paraBirimi)}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setDekontHareket(h)}
                          className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                          style={{ color: "var(--text-muted)" }}
                          aria-label="Dekont / belge ekle"
                          title="Dekont / belge ekle"
                        >
                          <Paperclip size={14} />
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
            Son {items.length} hareket (en yeni 500 ile sınırlı)
            {pending && " · güncelleniyor…"}
          </div>
        </div>
      )}

      <DataModal
        isOpen={dekontHareket !== null}
        onClose={() => setDekontHareket(null)}
        title="Dekont / Belge"
        description={
          dekontHareket
            ? `${dekontHareket.cari.unvan} · ${formatTarih(dekontHareket.tarih)} · ${formatPara(parseFloat(dekontHareket.tutar), dekontHareket.paraBirimi)}`
            : ""
        }
        size="lg"
      >
        {dekontHareket && (
          <DekontList hedef={{ tip: "hareket", id: dekontHareket.id }} />
        )}
      </DataModal>
    </>
  );
}

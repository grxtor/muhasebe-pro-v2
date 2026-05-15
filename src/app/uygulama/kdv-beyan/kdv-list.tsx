"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import {
  Calculator,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { Select } from "@/components/ui/form-field";
import { formatPara, formatTarih } from "@/lib/format";
import { FaturaYonu, faturaYonuEtiket } from "@/lib/enums";
import { downloadExcel } from "@/lib/excel";

export interface KdvBeyanItem {
  id: number;
  faturaNo: string;
  tarih: string;
  yon: string;
  durum: string;
  cari: { kod: string; unvan: string } | null;
  araToplam: number;
  kdvOrani: number;
  kdvTutari: number;
  toplamTutar: number;
  paraBirimi: string;
}

export interface KdvBeyanOzet {
  satisKdv: number;
  alisKdv: number;
  net: number;
  satisAraToplam: number;
  alisAraToplam: number;
  satisAdet: number;
  alisAdet: number;
}

interface Props {
  yil: number;
  ay: number;
  ozet: KdvBeyanOzet;
  items: KdvBeyanItem[];
}

const AY_ADLARI = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

export function KdvBeyanList({ yil, ay, ozet, items }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);

  function navigate(yeniYil: number, yeniAy: number) {
    const sp = new URLSearchParams();
    sp.set("yil", String(yeniYil));
    sp.set("ay", String(yeniAy));
    startTransition(() => {
      router.replace(`/uygulama/kdv-beyan?${sp.toString()}`, { scroll: false });
    });
  }

  function oncekiAy() {
    const yeniAy = ay === 1 ? 12 : ay - 1;
    const yeniYil = ay === 1 ? yil - 1 : yil;
    navigate(yeniYil, yeniAy);
  }

  function sonrakiAy() {
    const yeniAy = ay === 12 ? 1 : ay + 1;
    const yeniYil = ay === 12 ? yil + 1 : yil;
    navigate(yeniYil, yeniAy);
  }

  function changeAy(value: string) {
    navigate(yil, Number(value));
  }

  function changeYil(value: string) {
    navigate(Number(value), ay);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const ayAdi = AY_ADLARI[ay - 1];
      // Özet satırı + detay satırları
      const ozetSatirlari: Record<string, unknown>[] = [
        {
          Donem: `${ayAdi} ${yil}`,
          Aciklama: "SATIŞ KDV (Hesaplanan)",
          AraToplam: ozet.satisAraToplam,
          KdvTutari: ozet.satisKdv,
          GenelToplam: ozet.satisAraToplam + ozet.satisKdv,
          Adet: ozet.satisAdet,
        },
        {
          Donem: `${ayAdi} ${yil}`,
          Aciklama: "ALIŞ KDV (İndirilecek)",
          AraToplam: ozet.alisAraToplam,
          KdvTutari: ozet.alisKdv,
          GenelToplam: ozet.alisAraToplam + ozet.alisKdv,
          Adet: ozet.alisAdet,
        },
        {
          Donem: `${ayAdi} ${yil}`,
          Aciklama:
            ozet.net >= 0
              ? "ÖDENECEK KDV (Satış − Alış)"
              : "DEVREDEN KDV (Alış − Satış)",
          AraToplam: "",
          KdvTutari: Math.abs(ozet.net),
          GenelToplam: "",
          Adet: "",
        },
      ];

      const detaySatirlari = items.map((f) => ({
        Tarih: f.tarih.slice(0, 10),
        FaturaNo: f.faturaNo,
        Yon: faturaYonuEtiket[f.yon as keyof typeof faturaYonuEtiket] ?? f.yon,
        ProfilKodu: f.cari?.kod ?? "",
        ProfilUnvani: f.cari?.unvan ?? "",
        AraToplam: f.araToplam,
        KdvOrani: f.kdvOrani,
        KdvTutari: f.kdvTutari,
        GenelToplam: f.toplamTutar,
        ParaBirimi: f.paraBirimi,
      }));

      // Boş satır + detay
      const rows: Record<string, unknown>[] = [
        ...ozetSatirlari,
        {},
        ...detaySatirlari,
      ];

      const fileName = `kdv-beyan-${yil}-${String(ay).padStart(2, "0")}.xlsx`;
      downloadExcel(rows, `KDV ${ayAdi} ${yil}`, fileName);
      toast.success("KDV beyan dosyası indirildi");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      toast.error(`Dışa aktarım başarısız: ${msg}`);
    } finally {
      setExporting(false);
    }
  }

  const yilSecenekleri = yilAraligi(yil);
  const netPozitif = ozet.net >= 0;

  return (
    <>
      <PageHeader
        icon={<Calculator size={20} />}
        title="KDV Beyan"
        subtitle="Aylık KDV özeti — gönderilen ve gelen faturalardan otomatik hesaplanır"
        actions={
          <Button
            variant="ghost"
            size="md"
            onPress={handleExport}
            isDisabled={exporting || items.length === 0}
          >
            <span className="flex items-center gap-1.5">
              <Download size={16} />
              {exporting ? "Hazırlanıyor…" : "Excel İndir"}
            </span>
          </Button>
        }
      />

      {/* Ay/Yıl seçici + navigasyon */}
      <div
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={oncekiAy}
            className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: "var(--text-muted)" }}
            aria-label="Önceki ay"
            title="Önceki ay"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <Select
              value={String(ay)}
              onChange={(e) => changeAy(e.target.value)}
              className="!w-32"
            >
              {AY_ADLARI.map((adi, i) => (
                <option key={i + 1} value={i + 1}>
                  {adi}
                </option>
              ))}
            </Select>
            <Select
              value={String(yil)}
              onChange={(e) => changeYil(e.target.value)}
              className="!w-24"
            >
              {yilSecenekleri.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
          <button
            type="button"
            onClick={sonrakiAy}
            className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: "var(--text-muted)" }}
            aria-label="Sonraki ay"
            title="Sonraki ay"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div
          className="text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          Dönem: <strong>{AY_ADLARI[ay - 1]} {yil}</strong>
          {pending && " · güncelleniyor…"}
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Satış KDV (Hesaplanan)"
          value={formatPara(ozet.satisKdv)}
          hint={`${ozet.satisAdet} fatura · ara toplam ${formatPara(ozet.satisAraToplam)}`}
          tone="positive"
          icon={<ArrowUpRight size={18} />}
        />
        <StatCard
          label="Alış KDV (İndirilecek)"
          value={formatPara(ozet.alisKdv)}
          hint={`${ozet.alisAdet} fatura · ara toplam ${formatPara(ozet.alisAraToplam)}`}
          tone="brand"
          icon={<ArrowDownRight size={18} />}
        />
        <StatCard
          label={netPozitif ? "Ödenecek KDV" : "Devreden KDV"}
          value={formatPara(Math.abs(ozet.net))}
          hint={
            netPozitif
              ? "Satış − Alış (devlete ödenecek)"
              : "Alış − Satış (gelecek aya devredilir)"
          }
          tone={netPozitif ? "negative" : "positive"}
          icon={netPozitif ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Calculator size={22} />}
          title="Bu ay için fatura yok"
          description={`${AY_ADLARI[ay - 1]} ${yil} döneminde aktif (iptal edilmemiş) fatura bulunamadı. Faturalar sayfasından ekleyebilirsiniz.`}
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
                  <th className="px-4 py-3 font-medium">Fatura No</th>
                  <th className="px-4 py-3 font-medium">Yön</th>
                  <th className="px-4 py-3 font-medium">Profil</th>
                  <th className="px-4 py-3 text-right font-medium">Ara Toplam</th>
                  <th className="px-4 py-3 text-right font-medium">KDV %</th>
                  <th className="px-4 py-3 text-right font-medium">KDV Tutarı</th>
                  <th className="px-4 py-3 text-right font-medium">Toplam</th>
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
                      }}
                    >
                      <td
                        className="px-4 py-3 tabular-nums"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatTarih(f.tarih)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">
                        {f.faturaNo}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                          style={{
                            background: isGonderilen
                              ? "var(--positive-soft)"
                              : "var(--brand-soft)",
                            color: isGonderilen
                              ? "var(--positive)"
                              : "var(--brand)",
                          }}
                        >
                          {isGonderilen ? (
                            <ArrowUpRight size={11} />
                          ) : (
                            <ArrowDownRight size={11} />
                          )}
                          {faturaYonuEtiket[
                            f.yon as keyof typeof faturaYonuEtiket
                          ] ?? f.yon}
                        </span>
                      </td>
                      <td className="px-4 py-3">{f.cari?.unvan ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatPara(f.araToplam, f.paraBirimi)}
                      </td>
                      <td
                        className="px-4 py-3 text-right tabular-nums"
                        style={{ color: "var(--text-muted)" }}
                      >
                        %{f.kdvOrani.toFixed(0)}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-semibold tabular-nums"
                        style={{
                          color: isGonderilen
                            ? "var(--positive)"
                            : "var(--brand)",
                        }}
                      >
                        {formatPara(f.kdvTutari, f.paraBirimi)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatPara(f.toplamTutar, f.paraBirimi)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    borderTop: "2px solid var(--border-strong)",
                    background: "var(--surface-muted)",
                  }}
                >
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-right font-semibold"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Toplam
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                    {formatPara(ozet.satisAraToplam + ozet.alisAraToplam)}
                  </td>
                  <td />
                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                    {formatPara(ozet.satisKdv + ozet.alisKdv)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                    {formatPara(
                      ozet.satisAraToplam +
                        ozet.satisKdv +
                        ozet.alisAraToplam +
                        ozet.alisKdv,
                    )}
                  </td>
                </tr>
              </tfoot>
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
            {items.length} fatura · İptal edilmiş faturalar listeye dahil
            değildir.
          </div>
        </div>
      )}
    </>
  );
}

/** Verilen yıl çevresinde 2 yıl öncesi-2 yıl sonrası bir aralık üret. */
function yilAraligi(merkez: number): number[] {
  const out: number[] = [];
  for (let y = merkez - 2; y <= merkez + 2; y++) out.push(y);
  return out;
}

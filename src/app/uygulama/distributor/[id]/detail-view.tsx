"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import {
  ArrowLeft,
  BarChart3,
  Music2,
  Wallet,
  CalendarRange,
  Link2,
  Unlink,
  TrendingUp,
  TrendingDown,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { TextInput } from "@/components/ui/form-field";
import { formatPara, formatTarih } from "@/lib/format";
import {
  linkPromosyonKayit,
  unlinkPromosyonKayit,
  type EslesmeOnerisi,
} from "../actions";

export interface RaporOzet {
  id: number;
  ad: string;
  platform: string | null;
  donem: string;
  dosyaAdi: string | null;
  toplamGelir: string;
  paraBirimi: string;
  toplamStream: number;
  satirSayisi: number;
  notlar: string | null;
  olusturmaTarihi: string;
}

export interface PromosyonOdemeNotu {
  id: number;
  baslik: string;
  tutar: string;
  paraBirimi: string;
  cari: { id: number; unvan: string; kod: string } | null;
  videoBasligi: string | null;
  platform: string | null;
}

export interface DetaySatir {
  track: string;
  revenue: number;
  stream: number | null;
}

export interface DetayProps {
  rapor: RaporOzet;
  detaySatirlar: DetaySatir[];
  bagliKayitlar: PromosyonOdemeNotu[];
  oneriler: EslesmeOnerisi[];
}

export function DistributorDetail({
  rapor,
  detaySatirlar,
  bagliKayitlar,
  oneriler,
}: DetayProps) {
  const router = useRouter();
  const [arama, setArama] = useState("");
  const [pending, startTransition] = useTransition();

  const filtreliSatirlar = useMemo(() => {
    const q = arama.trim().toLowerCase();
    if (!q) return detaySatirlar.slice(0, 200);
    return detaySatirlar
      .filter((r) => r.track.toLowerCase().includes(q))
      .slice(0, 200);
  }, [detaySatirlar, arama]);

  // ROI: bağlı promosyon kayıtlarının toplam tutarı
  const promosyonToplam = bagliKayitlar.reduce(
    (acc, k) => acc + parseFloat(k.tutar),
    0,
  );
  const gelir = parseFloat(rapor.toplamGelir);
  const kar = gelir - promosyonToplam;
  const roiYuzde = promosyonToplam > 0 ? (kar / promosyonToplam) * 100 : null;

  function onLink(odemeNotuId: number) {
    startTransition(async () => {
      const r = await linkPromosyonKayit(rapor.id, odemeNotuId);
      if (r.ok) {
        toast.success("Bağlandı");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  function onUnlink(odemeNotuId: number) {
    startTransition(async () => {
      const r = await unlinkPromosyonKayit(rapor.id, odemeNotuId);
      if (r.ok) {
        toast.success("Bağlantı kaldırıldı");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <>
      <PageHeader
        icon={<BarChart3 size={20} />}
        title={rapor.ad}
        subtitle={`${rapor.platform ?? "Diğer"} · ${rapor.donem}${
          rapor.dosyaAdi ? ` · ${rapor.dosyaAdi}` : ""
        }`}
        actions={
          <Link href="/uygulama/distributor">
            <Button variant="ghost" size="md">
              <span className="flex items-center gap-1.5">
                <ArrowLeft size={14} /> Tüm Raporlar
              </span>
            </Button>
          </Link>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Toplam Gelir"
          value={formatPara(gelir, rapor.paraBirimi)}
          hint={`${rapor.satirSayisi} satır`}
          tone="positive"
          icon={<Wallet size={18} />}
        />
        <StatCard
          label="Toplam Stream"
          value={
            rapor.toplamStream > 0
              ? rapor.toplamStream.toLocaleString("tr-TR")
              : "—"
          }
          hint="Dinleme / izlenme"
          tone="neutral"
          icon={<Music2 size={18} />}
        />
        <StatCard
          label="Promosyon Harcaması"
          value={formatPara(promosyonToplam, rapor.paraBirimi)}
          hint={`${bagliKayitlar.length} bağlı kayıt`}
          tone={promosyonToplam > 0 ? "warning" : "neutral"}
          icon={<TrendingDown size={18} />}
        />
        <StatCard
          label={kar >= 0 ? "Net Kâr" : "Net Zarar"}
          value={formatPara(Math.abs(kar), rapor.paraBirimi)}
          hint={
            roiYuzde !== null
              ? `ROI ${roiYuzde.toFixed(1)}%`
              : "Henüz promosyon bağlı değil"
          }
          tone={kar >= 0 ? "positive" : "negative"}
          icon={<TrendingUp size={18} />}
        />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div
          className="rounded-xl border p-3 text-xs"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div
            className="mb-1 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-soft)" }}
          >
            Dönem
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <CalendarRange size={14} style={{ color: "var(--text-muted)" }} />
            <span className="font-mono">{rapor.donem}</span>
          </div>
        </div>
        <div
          className="rounded-xl border p-3 text-xs"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div
            className="mb-1 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-soft)" }}
          >
            Yükleme
          </div>
          <div>{formatTarih(rapor.olusturmaTarihi)}</div>
        </div>
        <div
          className="rounded-xl border p-3 text-xs"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div
            className="mb-1 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-soft)" }}
          >
            Notlar
          </div>
          <div style={{ color: rapor.notlar ? "var(--text)" : "var(--text-soft)" }}>
            {rapor.notlar ?? "—"}
          </div>
        </div>
      </div>

      {/* Detay tablo */}
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Rapor Satırları</h2>
          <div className="relative w-64">
            <Search
              size={14}
              className="pointer-events-none absolute top-3 left-3"
              style={{ color: "var(--text-soft)" }}
            />
            <TextInput
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Track ara…"
              className="pl-8"
            />
          </div>
        </div>
        {detaySatirlar.length === 0 ? (
          <div
            className="rounded-xl border p-6 text-center text-sm"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text-muted)",
            }}
          >
            Bu raporda satır bulunamadı.
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-xl border"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-sm">
                <thead
                  className="sticky top-0 text-left"
                  style={{
                    background: "var(--surface-muted)",
                    color: "var(--text-muted)",
                  }}
                >
                  <tr>
                    <th className="px-4 py-2 font-medium">Track / Video</th>
                    <th className="px-4 py-2 text-right font-medium">Stream</th>
                    <th className="px-4 py-2 text-right font-medium">Gelir</th>
                  </tr>
                </thead>
                <tbody>
                  {filtreliSatirlar.map((r, i) => (
                    <tr
                      key={i}
                      style={{
                        borderTop:
                          i === 0 ? "none" : "1px solid var(--border)",
                      }}
                    >
                      <td className="px-4 py-2">
                        {r.track || (
                          <span style={{ color: "var(--text-soft)" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {r.stream != null
                          ? r.stream.toLocaleString("tr-TR")
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">
                        {formatPara(r.revenue, rapor.paraBirimi)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              className="border-t px-4 py-2 text-xs"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface-muted)",
                color: "var(--text-muted)",
              }}
            >
              {filtreliSatirlar.length} / {detaySatirlar.length} satır
              {detaySatirlar.length > 200 && !arama && " (ilk 200 gösteriliyor)"}
            </div>
          </div>
        )}
      </section>

      {/* Promosyon eşleştir */}
      <section>
        <h2 className="mb-2 text-base font-semibold">Promosyon Eşleştir</h2>
        <p className="mb-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Track adlarıyla eşleşen promosyon kayıtları. Bağladığın kayıtlar ROI
          hesabına dahil olur.
        </p>

        {oneriler.length === 0 ? (
          <div
            className="rounded-xl border p-6 text-center text-sm"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text-muted)",
            }}
          >
            Eşleşen promosyon kaydı yok. Promosyon profili ile bir borç
            (Borçlar &gt; Yeni) oluştur, sonra buradan bağla.
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-xl border"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <table className="w-full text-sm">
              <thead
                className="text-left"
                style={{
                  background: "var(--surface-muted)",
                  color: "var(--text-muted)",
                }}
              >
                <tr>
                  <th className="px-4 py-2 font-medium">Promosyon</th>
                  <th className="px-4 py-2 font-medium">Eşleşen Track</th>
                  <th className="px-4 py-2 font-medium">Skor</th>
                  <th className="px-4 py-2 text-right font-medium">Tutar</th>
                  <th className="px-4 py-2 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {oneriler.map((o, i) => (
                  <tr
                    key={o.odemeNotuId}
                    style={{
                      borderTop:
                        i === 0 ? "none" : "1px solid var(--border)",
                      background: o.zatenBagli
                        ? "color-mix(in oklch, var(--positive) 6%, transparent)"
                        : undefined,
                    }}
                  >
                    <td className="px-4 py-2">
                      <div className="font-medium">{o.baslik}</div>
                      {(o.videoBasligi || o.platform) && (
                        <div
                          className="text-[10px]"
                          style={{ color: "var(--text-soft)" }}
                        >
                          {[o.platform, o.videoBasligi]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                    </td>
                    <td
                      className="px-4 py-2 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {o.bestTrack || "—"}
                    </td>
                    <td className="px-4 py-2">
                      <ScoreBadge score={o.score} />
                    </td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">
                      {formatPara(parseFloat(o.tutar), o.paraBirimi)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {o.zatenBagli ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={() => onUnlink(o.odemeNotuId)}
                          isDisabled={pending}
                        >
                          <span className="flex items-center gap-1.5">
                            <Unlink size={13} /> Kaldır
                          </span>
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onPress={() => onLink(o.odemeNotuId)}
                          isDisabled={pending}
                        >
                          <span className="flex items-center gap-1.5">
                            <Link2 size={13} /> Bağla
                          </span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  let bg = "var(--surface-muted)";
  let color = "var(--text-muted)";
  if (score >= 0.8) {
    bg = "var(--positive-soft)";
    color = "var(--positive)";
  } else if (score >= 0.5) {
    bg = "var(--warning-soft)";
    color = "var(--warning)";
  }
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
      style={{ background: bg, color }}
    >
      {pct}%
    </span>
  );
}

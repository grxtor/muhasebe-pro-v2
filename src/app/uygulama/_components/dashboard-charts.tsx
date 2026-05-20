"use client";

/**
 * Anasayfa grafik bileşenleri — Recharts client-only.
 * Server component'ten serileştirilmiş data prop olarak alır.
 *
 * Renkler `var(--positive)` / `var(--negative)` CSS değişkenlerinden okunur —
 * tema değiştiğinde grafikler otomatik uyum sağlar.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useState } from "react";
import { formatPara } from "@/lib/format";

/* ============================================================
   Tooltip içeriği için minimal tip — Recharts'ın iç tooltip
   payload sözleşmesini doğrudan import etmek yerine yalnızca
   ihtiyacımız olan alanları tipliyoruz (sürüm-uyumlu kalır).
   ============================================================ */
interface ParaTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    name?: string | number;
    value?: number | string;
    color?: string;
    dataKey?: string | number;
  }>;
}

/* ============================================================
   Tipler — server'dan gelen payload sözleşmeleri
   ============================================================ */

export interface AylikSeriPoint {
  /** "Oca 26" gibi kısa ay etiketi */
  ay: string;
  /** Alacak (gelen para) toplamı, TL */
  alacak: number;
  /** Borç (giden para) toplamı, TL */
  borc: number;
}

export interface BekleyenPie {
  alacak: number;
  borc: number;
}

export interface TopCariRow {
  cariId: number;
  unvan: string;
  toplam: number;
  paraBirimi: string;
}

/* ============================================================
   CSS değişkenlerini okumak için hook — tema değişikliğine uyumlu
   ============================================================ */

function useCssVar(name: string, fallback: string): string {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const read = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
      if (v) setValue(v);
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => obs.disconnect();
  }, [name]);
  return value;
}

/* ============================================================
   Tooltip — tutarları TR locale ile formatlar
   ============================================================ */

function ParaTooltip({ active, payload, label }: ParaTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        color: "var(--text)",
      }}
    >
      {label !== undefined && (
        <div className="mb-1 font-semibold">{label}</div>
      )}
      {payload.map((p, i) => (
        <div
          key={String(p.dataKey ?? p.name ?? i)}
          className="flex items-center gap-2"
        >
          <span
            aria-hidden
            className="inline-block size-2 rounded-full"
            style={{ background: p.color }}
          />
          <span style={{ color: "var(--text-muted)" }}>{p.name}:</span>
          <span className="font-semibold tabular-nums">
            {formatPara(Number(p.value ?? 0))}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   1) Aylık Gelir/Gider Bar Chart
   ============================================================ */

export function AylikGelirGiderChart({ data }: { data: AylikSeriPoint[] }) {
  const positive = useCssVar("--positive", "#16a34a");
  const negative = useCssVar("--negative", "#dc2626");
  const border = useCssVar("--border", "#e5e7eb");
  const textMuted = useCssVar("--text-muted", "#6b7280");

  // Tüm değerler 0 ise empty state'e benzer mesaj
  const hepsiBos = data.every((p) => p.alacak === 0 && p.borc === 0);

  return (
    <Kart baslik="Aylık Gelir / Gider" altBaslik="Son 6 ay">
      {hepsiBos ? (
        <div
          className="grid h-[250px] place-items-center text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          Henüz hareket yok
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={border}
              vertical={false}
            />
            <XAxis
              dataKey="ay"
              stroke={textMuted}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: border }}
            />
            <YAxis
              stroke={textMuted}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: border }}
              tickFormatter={(v: number) => kisaTutar(v)}
              width={56}
            />
            <Tooltip
              content={<ParaTooltip />}
              cursor={{ fill: "var(--surface-muted)", opacity: 0.4 }}
            />
            <Bar
              dataKey="alacak"
              name="Gelir"
              fill={positive}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="borc"
              name="Borç"
              fill={negative}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Kart>
  );
}

/* ============================================================
   2) Bekleyen Gelir/Ödeme Pie Chart
   ============================================================ */

export function BekleyenPieChart({ data }: { data: BekleyenPie }) {
  const positive = useCssVar("--positive", "#16a34a");
  const negative = useCssVar("--negative", "#dc2626");

  const slices = [
    { key: "alacak", name: "Bekleyen Gelirler", value: data.alacak, color: positive },
    { key: "borc", name: "Bekleyen Ödemeler", value: data.borc, color: negative },
  ];
  const toplam = data.alacak + data.borc;

  return (
    <Kart baslik="Bekleyen Bakiyeler" altBaslik="Açık gelir ve ödemeler">
      {toplam === 0 ? (
        <div
          className="grid h-[250px] place-items-center text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          Bekleyen kalem yok
        </div>
      ) : (
        <div className="grid h-[250px] grid-cols-[1fr_auto] items-center gap-4">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={slices.filter((s) => s.value > 0)}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                strokeWidth={0}
              >
                {slices
                  .filter((s) => s.value > 0)
                  .map((s) => (
                    <Cell key={s.key} fill={s.color} />
                  ))}
              </Pie>
              <Tooltip content={<ParaTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="pr-4 text-sm">
            {slices.map((s) => {
              const pct = toplam > 0 ? (s.value / toplam) * 100 : 0;
              return (
                <li key={s.key} className="mb-3 last:mb-0">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block size-2.5 rounded-full"
                      style={{ background: s.color }}
                    />
                    <span style={{ color: "var(--text-muted)" }}>{s.name}</span>
                  </div>
                  <div className="mt-0.5 ml-4.5 font-semibold tabular-nums">
                    {formatPara(s.value)}
                  </div>
                  <div
                    className="ml-4.5 text-xs"
                    style={{ color: "var(--text-soft)" }}
                  >
                    %{pct.toFixed(1)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Kart>
  );
}

/* ============================================================
   3) Top Cari listesi (müşteri veya tedarikçi)
   ============================================================ */

export function TopCariList({
  baslik,
  altBaslik,
  items,
  tone,
  bosMesaj,
}: {
  baslik: string;
  altBaslik: string;
  items: TopCariRow[];
  tone: "positive" | "negative";
  bosMesaj: string;
}) {
  const renk = tone === "positive" ? "var(--positive)" : "var(--negative)";
  const arkaplan =
    tone === "positive" ? "var(--positive-soft)" : "var(--negative-soft)";

  // En büyük tutarı bul — bar genişliği için yüzde hesabı
  const maks =
    items.length > 0
      ? Math.max(...items.map((r) => Number(r.toplam) || 0))
      : 0;

  return (
    <Kart baslik={baslik} altBaslik={altBaslik}>
      {items.length === 0 ? (
        <div
          className="grid h-[250px] place-items-center text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          {bosMesaj}
        </div>
      ) : (
        <ul className="space-y-3 pt-1">
          {items.map((row, i) => {
            const pct = maks > 0 ? (Number(row.toplam) / maks) * 100 : 0;
            const bas = bastiBaslik(row.unvan);
            return (
              <li key={row.cariId} className="flex items-center gap-3">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold"
                  style={{ background: arkaplan, color: renk }}
                  aria-hidden
                >
                  {bas}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">
                      {i + 1}. {row.unvan}
                    </span>
                    <span
                      className="shrink-0 text-sm font-semibold tabular-nums"
                      style={{ color: renk }}
                    >
                      {formatPara(Number(row.toplam), row.paraBirimi)}
                    </span>
                  </div>
                  <div
                    className="mt-1 h-1.5 overflow-hidden rounded-full"
                    style={{ background: "var(--surface-muted)" }}
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${pct}%`, background: renk }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Kart>
  );
}

/* ============================================================
   Yardımcılar
   ============================================================ */

function Kart({
  baslik,
  altBaslik,
  children,
}: {
  baslik: string;
  altBaslik?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border p-5"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <header className="mb-3">
        <h2 className="text-base font-semibold">{baslik}</h2>
        {altBaslik && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {altBaslik}
          </p>
        )}
      </header>
      {children}
    </div>
  );
}

/** "1.234.567" → "1.2M", "234500" → "234K" gibi kısa biçim — Y eksen için */
function kisaTutar(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${(v / 1_000).toFixed(a >= 10_000 ? 0 : 1)}K`;
  return v.toLocaleString("tr-TR");
}

/** Ünvanın baş harflerini al ("Acme Ticaret" → "AT") */
function bastiBaslik(unvan: string): string {
  const parcalar = unvan
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parcalar.length === 0) return "?";
  return parcalar.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

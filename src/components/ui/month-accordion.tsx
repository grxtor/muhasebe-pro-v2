"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { formatPara } from "@/lib/format";

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

interface MonthGroup<T> {
  /** "2026-05" gibi sıralanabilir anahtar */
  key: string;
  /** "Mayıs 2026" gibi insan etiketi */
  label: string;
  year: number;
  month: number;
  items: T[];
  /** Aylık toplam tutar (item.amount toplamı) */
  total: number;
  /** Para birimi karması (USD/TRY/EUR ayrı toplamlar) */
  totalsByCurrency: Record<string, number>;
}

interface MonthAccordionProps<T> {
  items: T[];
  /** Her item'dan ISO tarih (YYYY-MM-DD veya Date string) çıkarır */
  getDate: (item: T) => string;
  /** Her item'dan tutar çıkarır (subtotal için) */
  getAmount: (item: T) => number;
  /** Her item'dan para birimi (default "USD") */
  getCurrency?: (item: T) => string;
  /** Bir ay grubu için içerik render — tablo, kart liste, vs. */
  renderGroup: (group: MonthGroup<T>) => ReactNode;
  /** Subtotal renkleme — tone */
  tone?: "positive" | "negative" | "neutral";
  /** Default açık olan ay sayısı (üstten). 1 = sadece en yeni ay */
  defaultOpenCount?: number;
  /** Boş durum mesajı */
  emptyMessage?: string;
}

/**
 * MonthAccordion — generic aylık gruplama.
 *
 * Items tarihe göre yıl-ay gruplarına ayrılır. Her grup chevron'lu başlık;
 * tıklayınca açılır/kapanır. Üstten N ay default açık (default: 1).
 *
 * Subtotal: her ay başlığında item sayısı + para birimi başına toplam.
 *
 * @example
 *   <MonthAccordion
 *     items={odemeler}
 *     getDate={(o) => o.vadeTarihi}
 *     getAmount={(o) => parseFloat(o.tutar)}
 *     getCurrency={(o) => o.paraBirimi}
 *     renderGroup={(g) => <Table rows={g.items} />}
 *     tone="positive"
 *   />
 */
export function MonthAccordion<T>({
  items,
  getDate,
  getAmount,
  getCurrency = () => "USD",
  renderGroup,
  tone = "neutral",
  defaultOpenCount = 1,
  emptyMessage = "Kayıt yok",
}: MonthAccordionProps<T>) {
  const groups = useMemo(() => groupByMonth(items, getDate, getAmount, getCurrency), [items, getDate, getAmount, getCurrency]);

  /* Default açık olan ay anahtarları (en yeni N grup) */
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => {
    const s = new Set<string>();
    groups.slice(0, defaultOpenCount).forEach((g) => s.add(g.key));
    return s;
  });

  function toggle(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <div
        className="rounded-xl border px-4 py-8 text-center text-sm"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text-muted)",
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  const subtotalColor =
    tone === "positive"
      ? "var(--positive)"
      : tone === "negative"
      ? "var(--negative)"
      : "var(--text)";

  return (
    <div className="space-y-2">
      {groups.map((g) => {
        const isOpen = openKeys.has(g.key);
        return (
          <div
            key={g.key}
            className="overflow-hidden rounded-xl border"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <button
              type="button"
              onClick={() => toggle(g.key)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[color-mix(in_oklch,var(--accent)_4%,transparent)]"
            >
              <ChevronRight
                size={14}
                className="shrink-0 transition-transform"
                style={{
                  color: "var(--text-muted)",
                  transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                }}
              />
              <span className="text-sm font-semibold">{g.label}</span>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{
                  background: "var(--surface-muted)",
                  color: "var(--text-muted)",
                }}
              >
                {g.items.length} kayıt
              </span>
              <span className="ml-auto flex items-center gap-2 text-sm font-semibold tabular-nums">
                {Object.entries(g.totalsByCurrency).map(([cur, total]) => (
                  <span key={cur} style={{ color: subtotalColor }}>
                    {formatPara(total, cur)}
                  </span>
                ))}
              </span>
            </button>
            {isOpen && (
              <div
                className="border-t"
                style={{ borderColor: "var(--border)" }}
              >
                {renderGroup(g)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function groupByMonth<T>(
  items: T[],
  getDate: (item: T) => string,
  getAmount: (item: T) => number,
  getCurrency: (item: T) => string,
): MonthGroup<T>[] {
  const map = new Map<string, MonthGroup<T>>();
  for (const item of items) {
    const dateStr = getDate(item);
    if (!dateStr) continue;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) continue;
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const cur = getCurrency(item);
    const amt = getAmount(item);

    let g = map.get(key);
    if (!g) {
      g = {
        key,
        label: `${AY_ADLARI[month]} ${year}`,
        year,
        month,
        items: [],
        total: 0,
        totalsByCurrency: {},
      };
      map.set(key, g);
    }
    g.items.push(item);
    g.total += amt;
    g.totalsByCurrency[cur] = (g.totalsByCurrency[cur] ?? 0) + amt;
  }
  /* Sort descending — en yeni ay başta */
  return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
}

/**
 * ViewToggle — Liste / Aylık segmented control.
 */
export function ViewToggle({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon?: ReactNode }[];
}) {
  return (
    <div
      role="tablist"
      className="inline-flex rounded-lg border p-0.5 text-sm"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors"
            style={{
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#fff" : "var(--text-muted)",
            }}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

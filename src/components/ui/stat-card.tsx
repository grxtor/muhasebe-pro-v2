import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "neutral" | "positive" | "negative" | "warning" | "brand";
}

const toneStyles = {
  neutral: {
    bg: "var(--surface)",
    border: "var(--border)",
    bar: "var(--text-muted)",
    valueColor: "var(--text)",
  },
  positive: {
    bg: "var(--positive-soft)",
    border: "color-mix(in oklch, var(--positive) 25%, transparent)",
    bar: "var(--positive)",
    valueColor: "var(--positive)",
  },
  negative: {
    bg: "var(--negative-soft)",
    border: "color-mix(in oklch, var(--negative) 25%, transparent)",
    bar: "var(--negative)",
    valueColor: "var(--negative)",
  },
  warning: {
    bg: "var(--warning-soft)",
    border: "color-mix(in oklch, var(--warning) 25%, transparent)",
    bar: "var(--warning)",
    valueColor: "var(--warning)",
  },
  brand: {
    bg: "var(--brand-soft)",
    border: "color-mix(in oklch, var(--brand) 25%, transparent)",
    bar: "var(--brand)",
    valueColor: "var(--brand)",
  },
} as const;

/**
 * KPI kartı — sol şerit + label + değer + isteğe bağlı alt yazı.
 * Anasayfa ve modül üst kartlarında kullanılır.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: StatCardProps) {
  const t = toneStyles[tone];
  return (
    <div
      className="relative overflow-hidden rounded-xl border p-5"
      style={{
        background: t.bg,
        borderColor: t.border,
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: t.bar }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            {label}
          </div>
          <div
            className="mt-2 text-2xl font-bold tabular-nums"
            style={{ color: t.valueColor }}
          >
            {value}
          </div>
          {hint && (
            <div
              className="mt-1 text-xs"
              style={{ color: "var(--text-soft)" }}
            >
              {hint}
            </div>
          )}
        </div>
        {icon && (
          <div className="shrink-0" style={{ color: t.bar }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

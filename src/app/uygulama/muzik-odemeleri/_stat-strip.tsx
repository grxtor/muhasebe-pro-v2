/**
 * Kompakt KPI şerit — yatay dağıtılmış ufak stat hücreleri.
 * Müzik & İçerik modüllerinde sayfa üstünde kullanılır.
 */

interface StatItem {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  emphasized?: boolean;
}

export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <div
      className="flex flex-wrap items-stretch overflow-hidden rounded-xl border"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {items.map((item, i) => (
        <StatStripItem
          key={item.label}
          item={item}
          divider={i > 0}
        />
      ))}
    </div>
  );
}

function StatStripItem({
  item,
  divider,
}: {
  item: StatItem;
  divider: boolean;
}) {
  const tone = item.tone ?? "neutral";
  const colorMap = {
    positive: "var(--positive)",
    negative: "var(--negative)",
    neutral: "var(--text)",
  };
  const bg = item.emphasized
    ? tone === "positive"
      ? "var(--positive-soft)"
      : tone === "negative"
        ? "var(--negative-soft)"
        : "var(--surface-muted)"
    : "transparent";
  return (
    <div
      className="flex flex-1 flex-col gap-0.5 px-4 py-2.5"
      style={{
        background: bg,
        borderLeft: divider ? "1px solid var(--border)" : undefined,
        minWidth: "7rem",
      }}
    >
      <div
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-muted)" }}
      >
        {item.label}
      </div>
      <div
        className={`tabular-nums ${item.emphasized ? "text-lg font-bold" : "text-base font-semibold"}`}
        style={{ color: colorMap[tone] }}
      >
        {item.value}
      </div>
    </div>
  );
}

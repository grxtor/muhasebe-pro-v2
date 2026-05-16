/**
 * Tüm /uygulama altındaki sayfalar için varsayılan loading state.
 * Sayfa data fetch ederken bunu hemen gösterir — algılanan hız çok daha yüksek.
 *
 * Skeleton pattern: header + 3 stat card + tablo iskeleti
 */
export default function UygulamaLoading() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Box className="size-10 rounded-lg" />
        <div className="space-y-1.5">
          <Box className="h-5 w-40 rounded" />
          <Box className="h-3 w-64 rounded opacity-60" />
        </div>
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border p-4"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <Box className="h-3 w-20 rounded opacity-50" />
            <Box className="mt-2 h-7 w-32 rounded" />
            <Box className="mt-1 h-3 w-16 rounded opacity-40" />
          </div>
        ))}
      </div>

      {/* Filter bar skeleton */}
      <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
        <Box className="h-10 rounded-lg" />
        <Box className="h-10 rounded-lg" />
      </div>

      {/* Table skeleton */}
      <div
        className="overflow-hidden rounded-xl border"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div
          className="border-b px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <Box className="h-3 w-full max-w-md rounded opacity-50" />
        </div>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="border-b px-4 py-3 last:border-b-0"
            style={{ borderColor: "var(--border)" }}
          >
            <Box
              className="h-4 rounded opacity-50"
              style={{ width: `${60 + ((i * 13) % 30)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Basit shimmer kutusu — Tailwind v4 ile animate-pulse */
function Box({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse ${className ?? ""}`}
      style={{
        background:
          "linear-gradient(90deg, var(--surface-muted) 0%, var(--border) 50%, var(--surface-muted) 100%)",
        backgroundSize: "200% 100%",
        ...style,
      }}
    />
  );
}

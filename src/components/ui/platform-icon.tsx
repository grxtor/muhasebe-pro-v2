"use client";

import { Music2 } from "lucide-react";
import { MuzikMagaza } from "@/lib/enums";

/**
 * Platform marka logoları — inline SVG, lucide-react'in marka logoları
 * eksik (telif). Her biri brand color'lı dolu daire içinde monokrom işaret.
 */

interface PlatformIconProps {
  platform: MuzikMagaza | string;
  size?: number;
  /** false: sadece glyph, true: brand-renkli arka plan */
  filled?: boolean;
}

const BRAND_COLORS: Record<MuzikMagaza, string> = {
  YouTube: "#FF0000",
  Spotify: "#1DB954",
  AppleMusic: "#FA2D48",
  Deezer: "#A238FF",
  AmazonMusic: "#25D1DA",
  TikTok: "#000000",
  Instagram: "#E1306C",
  SoundCloud: "#FF5500",
  Diger: "#71717a",
};

export function isMuzikMagaza(value: string): value is MuzikMagaza {
  return value in MuzikMagaza;
}

export function platformBrandColor(platform: MuzikMagaza | string): string {
  if (isMuzikMagaza(platform)) return BRAND_COLORS[platform];
  return BRAND_COLORS.Diger;
}

export function PlatformIcon({
  platform,
  size = 16,
  filled = true,
}: PlatformIconProps) {
  const color = isMuzikMagaza(platform)
    ? BRAND_COLORS[platform]
    : BRAND_COLORS.Diger;

  const containerStyle = filled
    ? {
        background: color,
        color: "#fff",
      }
    : {
        background: "transparent",
        color,
      };

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        ...containerStyle,
      }}
      aria-label={typeof platform === "string" ? platform : ""}
    >
      <Glyph platform={platform} size={Math.floor(size * 0.65)} />
    </span>
  );
}

function Glyph({
  platform,
  size,
}: {
  platform: MuzikMagaza | string;
  size: number;
}) {
  const p = isMuzikMagaza(platform) ? platform : "Diger";
  switch (p) {
    case "Spotify":
      // 3 ses dalgası
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.5 14.4a.7.7 0 01-.96.23c-2.6-1.6-5.9-1.95-9.78-1.07a.7.7 0 11-.31-1.37c4.25-.96 7.92-.55 10.84 1.24a.7.7 0 01.21.97zm1.2-2.7a.88.88 0 01-1.2.29c-3-1.83-7.55-2.36-11.1-1.29a.88.88 0 11-.51-1.69c4.06-1.22 9.08-.62 12.52 1.49a.88.88 0 01.29 1.2zm.1-2.81C14.2 8.74 8.32 8.55 4.97 9.56a1.05 1.05 0 01-.61-2.01c3.84-1.17 10.32-.94 14.4 1.5a1.05 1.05 0 01-1.08 1.8z" />
        </svg>
      );
    case "YouTube":
      // Play üçgeni
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7L8 5z" />
        </svg>
      );
    case "AppleMusic":
      // Müzik notası
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3l-9 2v10.05A4 4 0 1012 17V8l7-1.5V13.05A4 4 0 1014 15V3h5z" />
        </svg>
      );
    case "AmazonMusic":
      // A harfi + nota
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 6h2v6a3 3 0 11-2-2.83V8zm-5.5 8c2.5 1.5 6 2 9 .5l.5 1.5c-3.5 1.5-7.5 1-10.5-1l1-1z" />
        </svg>
      );
    case "Deezer":
      // 4 bar equalizer
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="14" width="3.5" height="6" />
          <rect x="8" y="11" width="3.5" height="9" />
          <rect x="13" y="8" width="3.5" height="12" />
          <rect x="18" y="5" width="3.5" height="15" />
        </svg>
      );
    case "TikTok":
      // Musical note
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 3v11.5a3 3 0 11-3-3V8a6 6 0 106 6V8a5 5 0 005 5V9.5A3.5 3.5 0 0117.5 6 3.5 3.5 0 0114 2.5L13 3z" />
        </svg>
      );
    case "Instagram":
      // Kamera
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      );
    case "SoundCloud":
      // Bulut + dalgalar
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 14v4h1v-4H3zm2-1v6h1v-6H5zm2-1v8h1v-8H7zm2-2v10h1V10H9zm2-2v12h1V8h-1zm2 1v11h7a4 4 0 100-8 5 5 0 00-7-3z" />
        </svg>
      );
    case "Diger":
    default:
      return <Music2 size={size} />;
  }
}

export function platformDisplayName(platform: MuzikMagaza | string): string {
  if (platform === "AppleMusic") return "Apple Music";
  if (platform === "AmazonMusic") return "Amazon Music";
  return platform;
}

/**
 * PlatformAvatarStack — üst üste binmiş logolar. Çok platform sığar dar yere.
 * Tooltip için title attribute.
 */
export function PlatformAvatarStack({
  platforms,
  size = 22,
  max = 6,
}: {
  platforms: MuzikMagaza[];
  size?: number;
  max?: number;
}) {
  if (platforms.length === 0) return null;
  const shown = platforms.slice(0, max);
  const rest = platforms.length - shown.length;
  return (
    <div className="flex items-center">
      <div
        className="flex"
        style={{ paddingLeft: `${Math.max(0, (shown.length - 1) * (size * 0.35))}px` }}
      >
        {shown.map((p, i) => (
          <div
            key={p}
            title={platformDisplayName(p)}
            style={{
              marginLeft: i === 0 ? 0 : `-${size * 0.35}px`,
              zIndex: shown.length - i,
              border: "2px solid var(--surface)",
              borderRadius: "9999px",
              display: "inline-flex",
            }}
          >
            <PlatformIcon platform={p} size={size} />
          </div>
        ))}
      </div>
      {rest > 0 && (
        <span
          className="ml-1.5 inline-grid place-items-center rounded-full text-[10px] font-semibold"
          style={{
            width: size,
            height: size,
            background: "var(--surface-muted)",
            color: "var(--text-muted)",
            border: "2px solid var(--surface)",
          }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}

/**
 * PlatformRevenueRow — logo + ad + horizontal bar + tutar.
 * Bar uzunluğu = oran. Chart yerine inline anlaşılır görüntü.
 */
export function PlatformRevenueRow({
  platform,
  amount,
  max,
  currency = "USD",
  formatAmount = (a, c) =>
    `${a.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c}`,
}: {
  platform: MuzikMagaza | string;
  amount: number;
  max: number;
  currency?: string;
  formatAmount?: (amount: number, currency: string) => string;
}) {
  const ratio = max > 0 ? Math.min(1, amount / max) : 0;
  const color = platformBrandColor(platform);
  const name = platformDisplayName(platform);

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex shrink-0 items-center gap-2" style={{ width: 130 }}>
        <PlatformIcon platform={platform} size={18} />
        <span className="truncate text-sm">{name}</span>
      </div>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full" style={{ background: "var(--surface-muted)" }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${ratio * 100}%`,
            background: color,
            transition: "width 0.3s",
          }}
        />
      </div>
      <div
        className="shrink-0 text-right font-semibold tabular-nums"
        style={{ minWidth: 90, color: "var(--text)" }}
      >
        {formatAmount(amount, currency)}
      </div>
    </div>
  );
}

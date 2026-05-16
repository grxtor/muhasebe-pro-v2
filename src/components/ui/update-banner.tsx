"use client";

import { useState } from "react";
import { Download, Sparkles, RefreshCw, AlertCircle, X } from "lucide-react";
import { Button } from "@heroui/react";
import { useUpdater } from "@/lib/hooks/use-updater";
import { useIsElectron } from "@/lib/hooks/use-electron";

/**
 * Üst banner — yeni sürüm hazır olunca otomatik görünür.
 * - "available" → kullanıcıya "yeni sürüm bulundu, iniyor" mesajı
 * - "downloading" → ilerleme yüzdesi
 * - "downloaded" → "Güncelle ve yeniden başlat" butonu
 *
 * Sadece Electron'da render olur, web'de null döner.
 */
export function UpdateBanner() {
  const isElectron = useIsElectron();
  const { status, install } = useUpdater();
  const [dismissed, setDismissed] = useState(false);

  if (!isElectron) return null;
  if (status.state === "idle" || status.state === "not-available") return null;
  if (status.state === "error" && dismissed) return null;

  // Hata banner'ı
  if (status.state === "error") {
    return (
      <Banner
        tone="warning"
        icon={<AlertCircle size={16} />}
        onDismiss={() => setDismissed(true)}
      >
        Güncelleme kontrolü başarısız:{" "}
        <span style={{ opacity: 0.8 }}>{status.message}</span>
      </Banner>
    );
  }

  // Güncelleme bulundu — otomatik indiriyor
  if (status.state === "available") {
    return (
      <Banner
        tone="info"
        icon={<Sparkles size={16} />}
      >
        <strong>Yeni sürüm bulundu</strong> ({status.version}) — arka planda
        indiriliyor…
      </Banner>
    );
  }

  // İndiriliyor — yüzde
  if (status.state === "downloading") {
    return (
      <Banner
        tone="info"
        icon={
          <Download size={16} className="animate-pulse" />
        }
      >
        Güncelleme indiriliyor… <strong>%{status.percent}</strong>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full"
          style={{ background: "color-mix(in oklch, var(--accent) 20%, transparent)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${status.percent}%`,
              background: "var(--accent)",
            }}
          />
        </div>
      </Banner>
    );
  }

  // İndirildi — "şimdi güncelle" butonu
  if (status.state === "downloaded") {
    return (
      <Banner
        tone="success"
        icon={<Sparkles size={16} />}
        action={
          <Button
            variant="primary"
            size="sm"
            onPress={() => void install()}
          >
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw size={13} /> Güncelle ve Yeniden Başlat
            </span>
          </Button>
        }
      >
        <strong>v{status.version} hazır</strong> — yeniden başlatınca yüklenecek.
      </Banner>
    );
  }

  return null;
}

function Banner({
  tone,
  icon,
  children,
  action,
  onDismiss,
}: {
  tone: "info" | "success" | "warning";
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
}) {
  const toneStyle: Record<typeof tone, { bg: string; color: string; border: string }> = {
    info: {
      bg: "color-mix(in oklch, var(--accent) 12%, var(--surface))",
      color: "var(--accent)",
      border: "color-mix(in oklch, var(--accent) 40%, transparent)",
    },
    success: {
      bg: "var(--positive-soft)",
      color: "var(--positive)",
      border: "color-mix(in oklch, var(--positive) 35%, transparent)",
    },
    warning: {
      bg: "var(--warning-soft)",
      color: "var(--warning)",
      border: "color-mix(in oklch, var(--warning) 35%, transparent)",
    },
  };
  const s = toneStyle[tone];
  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b px-4 py-2.5 text-sm md:px-6"
      style={{
        background: s.bg,
        borderColor: s.border,
        color: s.color,
      }}
    >
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 min-w-0" style={{ color: "var(--text)" }}>
        {children}
      </div>
      {action}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10"
          style={{ color: s.color }}
          aria-label="Kapat"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

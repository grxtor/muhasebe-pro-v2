"use client";

import type { ReactNode } from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  name?: string;
  /** Form data'da çıkacak boolean değerin string karşılığı */
  trueValue?: string;
  falseValue?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  "aria-label"?: string;
}

/**
 * iOS-style switch — pure CSS track + thumb. HeroUI v3 Switch compound
 * API'sini denedik, sr-only input dışında hiçbir görsel render etmiyordu.
 * Tek-element düz button switch güvenli, her zaman görünür.
 */
export function Switch({
  checked,
  onChange,
  name,
  trueValue = "true",
  falseValue = "false",
  size = "md",
  disabled = false,
  "aria-label": ariaLabel,
}: SwitchProps) {
  const trackW = size === "sm" ? 28 : 36;
  const trackH = size === "sm" ? 16 : 20;
  const thumbSize = size === "sm" ? 12 : 16;
  const padding = (trackH - thumbSize) / 2;
  const translateX = trackW - thumbSize - padding * 2;

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className="relative inline-flex shrink-0 cursor-pointer items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          width: trackW,
          height: trackH,
          padding,
          background: checked ? "var(--accent)" : "var(--surface-muted)",
          borderColor: checked ? "var(--accent)" : "var(--border-strong)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none inline-block rounded-full shadow-sm transition-transform"
          style={{
            width: thumbSize,
            height: thumbSize,
            background: checked ? "#fff" : "var(--text-soft)",
            transform: `translateX(${checked ? translateX : 0}px)`,
          }}
        />
      </button>
      {name && (
        <input
          type="hidden"
          name={name}
          value={checked ? trueValue : falseValue}
        />
      )}
    </>
  );
}

/**
 * SwitchRow — Switch + label + opsiyonel description. Kart şeklinde değil,
 * inline flex satır. Tone'a göre seçildiğinde sade bir renk vurgusu alır.
 */
export function SwitchRow({
  checked,
  onChange,
  name,
  label,
  description,
  icon,
  tone = "default",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  name?: string;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "warning" | "positive";
}) {
  const labelColor =
    checked && tone === "warning"
      ? "var(--warning)"
      : checked && tone === "positive"
      ? "var(--positive)"
      : "var(--text)";

  return (
    <div className="flex items-start gap-3">
      <div className="pt-0.5">
        <Switch checked={checked} onChange={onChange} name={name} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="flex items-center gap-1.5 text-sm font-medium leading-tight"
          style={{ color: labelColor }}
        >
          {icon}
          {label}
        </div>
        {description && (
          <div
            className="mt-0.5 text-xs leading-snug"
            style={{ color: "var(--text-muted)" }}
          >
            {description}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
  footer?: ReactNode;
}

const sizeClass: Record<NonNullable<DataModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

/**
 * Hafif, kontrollü modal. HeroUI v3'ün Modal yapısı yerine kendi bileşenimizi
 * kullanıyoruz çünkü create/edit akışlarında programatik state istiyoruz.
 *
 * - ESC ile kapanır (effect ile)
 * - Backdrop tıklamasıyla kapanır
 * - Scroll-lock body üzerine eklenir (effect)
 * - Modal içeriği body-scroll'la birlikte hareket eder
 */
import { useEffect } from "react";

export function DataModal({
  isOpen,
  onClose,
  title,
  description,
  size = "lg",
  children,
  footer,
}: DataModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-modal-title"
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4"
    >
      <button
        aria-label="Kapat"
        className="fixed inset-0 -z-10 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizeClass[size]} max-h-[calc(100vh-2rem)] overflow-hidden rounded-2xl border shadow-2xl`}
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <header
          className="flex items-start justify-between gap-4 border-b px-6 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="min-w-0">
            <h2
              id="data-modal-title"
              className="truncate text-lg font-semibold"
            >
              {title}
            </h2>
            {description && (
              <p
                className="mt-0.5 text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={18} />
          </button>
        </header>

        <div className="max-h-[calc(100vh-13rem)] overflow-y-auto px-6 py-5">
          {children}
        </div>

        {footer && (
          <footer
            className="flex items-center justify-end gap-2 border-t px-6 py-4"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface-muted)",
            }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

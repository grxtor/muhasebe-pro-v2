"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useEffect } from "react";

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  /** Dense layout — daha az padding, daha küçük tipografi */
  compact?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

const sizeClass: Record<NonNullable<DataModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  "2xl": "max-w-3xl",
  "3xl": "max-w-4xl",
};

/**
 * Hafif, kontrollü modal.
 *
 * Yenilenmiş v2:
 *  • px-5 py-4 (eskiden px-7 py-5/6) — daha kompakt
 *  • Header sticky, footer sticky — uzun form'larda alt CTA hep görünür
 *  • size="2xl"/"3xl" — geniş ekranda iki kolonlu form için
 *  • compact prop'u — daha küçük dialog'lar için daha sık padding
 *
 * 2-column layout için <DialogColumns> kullanın:
 *   <DataModal size="2xl">
 *     <DialogColumns>
 *       <DialogColumn>...</DialogColumn>
 *       <DialogColumn>...</DialogColumn>
 *     </DialogColumns>
 *   </DataModal>
 */
export function DataModal({
  isOpen,
  onClose,
  title,
  description,
  size = "lg",
  compact = false,
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

  const padX = compact ? "px-4" : "px-5";
  const headerPadY = compact ? "py-3" : "py-3.5";
  const bodyPadY = compact ? "py-3" : "py-4";
  const footerPadY = compact ? "py-3" : "py-3.5";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-modal-title"
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4"
    >
      <button
        aria-label="Kapat"
        className="fixed inset-0 -z-10 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={`relative flex w-full ${sizeClass[size]} max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-xl border shadow-2xl`}
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <header
          className={`flex items-start justify-between gap-3 border-b ${padX} ${headerPadY}`}
          style={{ borderColor: "var(--border)" }}
        >
          <div className="min-w-0">
            <h2
              id="data-modal-title"
              className="truncate text-base font-semibold leading-tight"
            >
              {title}
            </h2>
            {description && (
              <p
                className="mt-0.5 text-xs leading-snug"
                style={{ color: "var(--text-muted)" }}
              >
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="-mr-1 shrink-0 rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={16} />
          </button>
        </header>

        <div className={`flex-1 overflow-y-auto ${padX} ${bodyPadY}`}>
          {children}
        </div>

        {footer && (
          <footer
            className={`flex items-center justify-end gap-2 border-t ${padX} ${footerPadY}`}
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

/**
 * DialogColumns — geniş ekranda dialog body'sini 2 kolona böler.
 * Mobile/küçük tablette tek kolon. lg+ ekranda yan yana.
 *
 * Her kolon space-y-4 ile vertical stack.
 */
export function DialogColumns({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-8">
      {children}
    </div>
  );
}

/** DialogColumn — DialogColumns içinde tek kolon. Vertical stack. */
export function DialogColumn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`space-y-4 ${className ?? ""}`}>{children}</div>;
}

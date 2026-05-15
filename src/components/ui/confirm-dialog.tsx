"use client";

import { useEffect } from "react";
import { Button } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
}

/**
 * Onay diyaloğu — özellikle silme işlemleri için.
 * window.confirm yerine kullanılır, görsel olarak tutarlı.
 */
export function ConfirmDialog({
  isOpen,
  onCancel,
  onConfirm,
  title,
  description,
  confirmText = "Onayla",
  cancelText = "İptal",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const iconBg =
    variant === "danger" ? "var(--negative-soft)" : "var(--brand-soft)";
  const iconColor =
    variant === "danger" ? "var(--negative)" : "var(--brand)";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[60] grid place-items-center p-4"
    >
      <button
        aria-label="İptal"
        className="fixed inset-0 -z-10 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="grid size-10 shrink-0 place-items-center rounded-full"
            style={{ background: iconBg, color: iconColor }}
          >
            <AlertTriangle size={20} />
          </div>
          <div className="space-y-1">
            <h3
              id="confirm-dialog-title"
              className="text-base font-semibold"
            >
              {title}
            </h3>
            {description && (
              <p
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="md"
            onPress={onCancel}
            isDisabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            size="md"
            onPress={() => void onConfirm()}
            isDisabled={isLoading}
          >
            {isLoading ? "İşleniyor…" : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

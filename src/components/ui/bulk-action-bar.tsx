"use client";

import { Trash2, X, Download } from "lucide-react";
import { Button } from "@heroui/react";

interface BulkAction {
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  onPress: () => void | Promise<void>;
  variant?: "danger" | "primary" | "ghost";
  isDisabled?: boolean;
}

interface Props {
  selectedCount: number;
  totalCount: number;
  onClear: () => void;
  onSelectAll?: () => void;
  actions: BulkAction[];
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onClear,
  onSelectAll,
  actions,
}: Props) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="toolbar"
      className="fixed bottom-6 left-1/2 z-40 flex max-w-[min(calc(100vw-2rem),52rem)] -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-2 shadow-2xl"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-strong)",
        boxShadow:
          "0 10px 30px oklch(0 0 0 / 0.15), 0 4px 10px oklch(0 0 0 / 0.08)",
      }}
    >
      <button
        onClick={onClear}
        className="rounded-full p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
        style={{ color: "var(--text-muted)" }}
        aria-label="Seçimi temizle"
        title="Seçimi temizle (Esc)"
      >
        <X size={14} />
      </button>

      <div
        className="flex items-center gap-1 text-sm font-medium tabular-nums"
        style={{ color: "var(--text)" }}
      >
        <span>{selectedCount}</span>
        <span style={{ color: "var(--text-muted)" }}>/ {totalCount} seçili</span>
      </div>

      {onSelectAll && selectedCount < totalCount && (
        <button
          onClick={onSelectAll}
          className="rounded-md px-2 py-1 text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          style={{ color: "var(--text-muted)" }}
        >
          Hepsini seç
        </button>
      )}

      <div
        className="ml-1 h-5 w-px"
        style={{ background: "var(--border)" }}
      />

      <div className="flex items-center gap-1">
        {actions.map((a, i) => {
          const Icon = a.icon;
          return (
            <Button
              key={i}
              variant={a.variant ?? "ghost"}
              size="sm"
              onPress={() => void a.onPress()}
              isDisabled={a.isDisabled}
            >
              <span className="inline-flex items-center gap-1.5">
                {Icon && <Icon size={13} />}
                {a.label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Standart "Sil" bulk action — neredeyse her listede kullanılır.
 */
export function deleteBulkAction(
  onDelete: () => Promise<void>,
  count: number,
  loading: boolean,
): BulkAction {
  return {
    label: loading ? "Siliniyor…" : `${count} kaydı sil`,
    icon: Trash2,
    onPress: onDelete,
    variant: "danger",
    isDisabled: loading,
  };
}

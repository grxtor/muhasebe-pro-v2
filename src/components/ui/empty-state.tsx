import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

/**
 * Boş durum kartı — liste/tablo boşken sayfayı kişiliksiz "yok" satırı yerine
 * dolduran kart.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center ${
        compact ? "px-6 py-8" : "px-8 py-16"
      }`}
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {icon && (
        <div
          className="grid size-12 place-items-center rounded-full"
          style={{
            background: "var(--surface-muted)",
            color: "var(--text-muted)",
          }}
        >
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {description && (
          <p
            className="mx-auto max-w-sm text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

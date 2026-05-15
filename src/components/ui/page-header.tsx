import type { ReactNode } from "react";

interface PageHeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/**
 * Sayfa üst başlığı — tüm /uygulama altındaki sayfalarda kullanılır.
 * Solda ikon + başlık + alt başlık; sağda eylem(ler).
 */
export function PageHeader({ icon, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <span
            className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl"
            style={{
              background: "var(--brand-soft)",
              color: "var(--brand)",
            }}
          >
            {icon}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p
              className="mt-0.5 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

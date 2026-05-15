"use client";

import { useEffect, useTransition } from "react";
import { Button } from "@heroui/react";
import { Sun, Moon, Monitor, Maximize, Minimize } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "../profil-form";
import { updateGorunum } from "../actions";
import { useTheme, type Theme } from "@/lib/theme";

interface Props {
  initial: {
    tema: string;
    yogunluk: string;
  };
}

export function GorunumForm({ initial }: Props) {
  const { theme, setTheme } = useTheme();
  const [pending, start] = useTransition();

  // Sayfa açıldığında DB'deki tercihi local theme provider'a senkronize et
  useEffect(() => {
    if (
      (initial.tema === "light" ||
        initial.tema === "dark" ||
        initial.tema === "system") &&
      theme !== initial.tema
    ) {
      setTheme(initial.tema as Theme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(formData: FormData) {
    const r = await updateGorunum(formData);
    if (r.ok) {
      const t = formData.get("tema") as Theme;
      setTheme(t);
      toast.success("Görünüm tercihleri kaydedildi");
    } else {
      toast.error(r.error);
    }
  }

  return (
    <form action={(fd) => start(() => void submit(fd))} className="space-y-6">
      <SectionCard
        title="Tema"
        description="Açık, koyu veya sistem temasını otomatik takip et"
      >
        <div className="grid grid-cols-3 gap-3">
          <ThemeCard
            value="light"
            current={theme}
            label="Açık"
            icon={<Sun size={20} />}
          />
          <ThemeCard
            value="dark"
            current={theme}
            label="Koyu"
            icon={<Moon size={20} />}
          />
          <ThemeCard
            value="system"
            current={theme}
            label="Sistem"
            icon={<Monitor size={20} />}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Yoğunluk"
        description="Tablolarda ve liste görünümlerinde satır yüksekliği"
      >
        <div className="grid grid-cols-2 gap-3">
          <DensityCard
            value="comfortable"
            current={initial.yogunluk}
            label="Rahat"
            description="Standart boşluk"
            icon={<Maximize size={18} />}
          />
          <DensityCard
            value="compact"
            current={initial.yogunluk}
            label="Sıkışık"
            description="Daha fazla satır görünür"
            icon={<Minimize size={18} />}
          />
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="md" isDisabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}

function ThemeCard({
  value,
  current,
  label,
  icon,
}: {
  value: "light" | "dark" | "system";
  current: string;
  label: string;
  icon: React.ReactNode;
}) {
  const checked = current === value;
  return (
    <label
      className="relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 transition-colors"
      style={{
        background: checked ? "var(--surface-muted)" : "var(--surface)",
        borderColor: checked ? "var(--text)" : "var(--border-strong)",
      }}
    >
      <input
        type="radio"
        name="tema"
        value={value}
        defaultChecked={checked}
        className="sr-only"
      />
      <span style={{ color: checked ? "var(--text)" : "var(--text-muted)" }}>
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}

function DensityCard({
  value,
  current,
  label,
  description,
  icon,
}: {
  value: "comfortable" | "compact";
  current: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  const checked = current === value;
  return (
    <label
      className="relative flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors"
      style={{
        background: checked ? "var(--surface-muted)" : "var(--surface)",
        borderColor: checked ? "var(--text)" : "var(--border-strong)",
      }}
    >
      <input
        type="radio"
        name="yogunluk"
        value={value}
        defaultChecked={checked}
        className="sr-only"
      />
      <span style={{ color: checked ? "var(--text)" : "var(--text-muted)" }}>
        {icon}
      </span>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          {description}
        </div>
      </div>
    </label>
  );
}

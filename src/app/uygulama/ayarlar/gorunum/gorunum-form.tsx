"use client";

import { useEffect, useState, useTransition } from "react";
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
  const { theme: contextTheme, setTheme } = useTheme();
  const [pending, start] = useTransition();

  // Lokal state — anında görsel feedback için
  const [selectedTema, setSelectedTema] = useState<Theme>(
    (initial.tema as Theme) ?? "system",
  );
  const [selectedYogunluk, setSelectedYogunluk] = useState<string>(
    initial.yogunluk ?? "comfortable",
  );

  // Sayfa açıldığında DB'deki tercihi local theme provider'a senkronize et
  useEffect(() => {
    if (
      (initial.tema === "light" ||
        initial.tema === "dark" ||
        initial.tema === "system") &&
      contextTheme !== initial.tema
    ) {
      setTheme(initial.tema as Theme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tema seçimi anında uygula (kullanıcı seçer seçmez canlı önizleme)
  function onTemaChange(t: Theme) {
    setSelectedTema(t);
    setTheme(t);
  }

  async function submit() {
    start(async () => {
      const fd = new FormData();
      fd.set("tema", selectedTema);
      fd.set("yogunluk", selectedYogunluk);
      const r = await updateGorunum(fd);
      if (r.ok) toast.success("Görünüm tercihleri kaydedildi");
      else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Tema"
        description="Açık, koyu veya sistem temasını otomatik takip et — seçer seçmez canlı önizleme"
      >
        <div className="grid grid-cols-3 gap-3">
          <ThemeCard
            value="light"
            current={selectedTema}
            onSelect={onTemaChange}
            label="Açık"
            icon={<Sun size={20} />}
          />
          <ThemeCard
            value="dark"
            current={selectedTema}
            onSelect={onTemaChange}
            label="Koyu"
            icon={<Moon size={20} />}
          />
          <ThemeCard
            value="system"
            current={selectedTema}
            onSelect={onTemaChange}
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
            current={selectedYogunluk}
            onSelect={setSelectedYogunluk}
            label="Rahat"
            description="Standart boşluk"
            icon={<Maximize size={18} />}
          />
          <DensityCard
            value="compact"
            current={selectedYogunluk}
            onSelect={setSelectedYogunluk}
            label="Sıkışık"
            description="Daha fazla satır görünür"
            icon={<Minimize size={18} />}
          />
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="md"
          onPress={submit}
          isDisabled={pending}
        >
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </div>
  );
}

function ThemeCard({
  value,
  current,
  onSelect,
  label,
  icon,
}: {
  value: Theme;
  current: Theme;
  onSelect: (v: Theme) => void;
  label: string;
  icon: React.ReactNode;
}) {
  const checked = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={checked}
      className="relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 transition-all"
      style={{
        background: checked ? "var(--surface-muted)" : "var(--surface)",
        borderColor: checked ? "var(--text)" : "var(--border-strong)",
        borderWidth: checked ? "2px" : "1px",
        padding: checked ? "calc(1rem - 1px)" : "1rem",
      }}
    >
      <span style={{ color: checked ? "var(--text)" : "var(--text-muted)" }}>
        {icon}
      </span>
      <span
        className="text-sm font-medium"
        style={{ color: checked ? "var(--text)" : "var(--text-muted)" }}
      >
        {label}
      </span>
    </button>
  );
}

function DensityCard({
  value,
  current,
  onSelect,
  label,
  description,
  icon,
}: {
  value: string;
  current: string;
  onSelect: (v: string) => void;
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  const checked = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={checked}
      className="relative flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-left transition-all"
      style={{
        background: checked ? "var(--surface-muted)" : "var(--surface)",
        borderColor: checked ? "var(--text)" : "var(--border-strong)",
        borderWidth: checked ? "2px" : "1px",
        padding: checked ? "calc(1rem - 1px)" : "1rem",
      }}
    >
      <span style={{ color: checked ? "var(--text)" : "var(--text-muted)" }}>
        {icon}
      </span>
      <div>
        <div
          className="text-sm font-medium"
          style={{ color: checked ? "var(--text)" : "var(--text-muted)" }}
        >
          {label}
        </div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          {description}
        </div>
      </div>
    </button>
  );
}

"use client";

import { useState } from "react";
import { useKeyboardShortcut, modKeyLabel } from "@/lib/hooks/use-keyboard";
import { DataModal } from "./data-modal";

interface ShortcutInfo {
  group: string;
  items: { keys: string[]; label: string }[];
}

const shortcuts: ShortcutInfo[] = [
  {
    group: "Genel",
    items: [
      { keys: [modKeyLabel(), "K"], label: "Komut paleti" },
      { keys: ["/"], label: "Komut paleti (kısa yol)" },
      { keys: ["?"], label: "Bu yardım penceresi" },
      { keys: ["Esc"], label: "Modal'ı kapat / aramayı temizle" },
    ],
  },
  {
    group: "Gezinme (önce 'g' bas, sonra)",
    items: [
      { keys: ["G", "H"], label: "Anasayfa" },
      { keys: ["G", "P"], label: "Profiller" },
      { keys: ["G", "F"], label: "Faturalar" },
      { keys: ["G", "A"], label: "Gelirler" },
      { keys: ["G", "B"], label: "Ödemeler" },
      { keys: ["G", "S"], label: "Ayarlar" },
    ],
  },
  {
    group: "Sayfa içi",
    items: [
      { keys: ["N"], label: "Yeni kayıt (sayfanın bağlamına göre)" },
    ],
  },
  {
    group: "Komut paletinde",
    items: [
      { keys: ["↑", "↓"], label: "Seçim gez" },
      { keys: ["↵"], label: "Seçili eylemi çalıştır" },
    ],
  },
];

export function ShortcutsHelp() {
  const [isOpen, setOpen] = useState(false);

  useKeyboardShortcut({
    keys: "?",
    handler: () => setOpen(true),
  });

  useKeyboardShortcut({
    keys: "shift+/",
    handler: () => setOpen(true),
  });

  return (
    <DataModal
      isOpen={isOpen}
      onClose={() => setOpen(false)}
      title="Klavye Kısayolları"
      description="Hızlı çalışmanı sağlayacak kısayollar"
      size="md"
    >
      <div className="space-y-5">
        {shortcuts.map((g) => (
          <div key={g.group}>
            <div
              className="mb-2 text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-soft)" }}
            >
              {g.group}
            </div>
            <ul className="space-y-1.5">
              {g.items.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span style={{ color: "var(--text-muted)" }}>{s.label}</span>
                  <span className="flex items-center gap-1">
                    {s.keys.map((k, ki) => (
                      <kbd
                        key={ki}
                        className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border px-1.5 font-mono text-[11px] font-medium"
                        style={{
                          background: "var(--surface-muted)",
                          borderColor: "var(--border-strong)",
                          color: "var(--text)",
                        }}
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </DataModal>
  );
}

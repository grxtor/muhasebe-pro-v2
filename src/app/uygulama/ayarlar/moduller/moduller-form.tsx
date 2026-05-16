"use client";

import { useState, useTransition } from "react";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import {
  Receipt,
  ListOrdered,
  Package,
  Repeat,
  Bell,
  Tag,
  Info,
  FileText,
  Wallet,
  Calculator,
  BarChart3,
  LineChart,
  HandCoins,
} from "lucide-react";
import { SectionCard } from "../profil-form";
import { updateModuller } from "../actions";
import { OPTIONAL_MODULES, type ModuleFlags, type ModuleKey } from "@/lib/modules";

const MODULE_ICONS: Record<ModuleKey, React.ComponentType<{ size?: number }>> = {
  faturalar: Receipt,
  hareketler: ListOrdered,
  urunler: Package,
  tekrarlayanlar: Repeat,
  hatirlaticilar: Bell,
  etiketler: Tag,
  cekSenet: FileText,
  kasa: Wallet,
  kdvBeyan: Calculator,
  distributor: BarChart3,
  ticaret: LineChart,
  avans: HandCoins,
};

interface Props {
  flags: ModuleFlags;
  stats: Record<ModuleKey, number>;
}

export function ModullerForm({ flags, stats }: Props) {
  const [state, setState] = useState<ModuleFlags>(flags);
  const [pending, start] = useTransition();

  function toggle(key: ModuleKey) {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function submit() {
    start(async () => {
      const fd = new FormData();
      // Aktif olan modülleri ekle, false olanlar formData'da olmayacak
      // (Bu yüzden action tarafında "has" kontrolü yapıyoruz)
      if (state.faturalar) fd.set("modulFaturalar", "true");
      if (state.hareketler) fd.set("modulHareketler", "true");
      if (state.urunler) fd.set("modulUrunler", "true");
      if (state.tekrarlayanlar) fd.set("modulTekrarlayanlar", "true");
      if (state.hatirlaticilar) fd.set("modulHatirlaticilar", "true");
      if (state.etiketler) fd.set("modulEtiketler", "true");
      if (state.cekSenet) fd.set("modulCekSenet", "true");
      if (state.kasa) fd.set("modulKasa", "true");
      if (state.kdvBeyan) fd.set("modulKdvBeyan", "true");

      const r = await updateModuller(fd);
      if (r.ok) {
        toast.success("Modül tercihleri kaydedildi");
        // Sayfa yenilensin — sidebar güncellensin
        setTimeout(() => window.location.reload(), 400);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Çekirdek Modüller"
        description="Her zaman açık — kapatılamaz"
      >
        <CoreList />
      </SectionCard>

      <SectionCard
        title="Opsiyonel Modüller"
        description="Kullanmadığın modülleri kapatabilirsin. Mevcut datan kaybolmaz, sadece menüden gizlenir."
      >
        <div className="space-y-3">
          {OPTIONAL_MODULES.map((mod) => {
            const Icon = MODULE_ICONS[mod.key];
            const active = state[mod.key];
            const count = stats[mod.key] ?? 0;
            return (
              <label
                key={mod.key}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors"
                style={{
                  background: active ? "var(--surface)" : "var(--surface-muted)",
                  borderColor: active ? "var(--border-strong)" : "var(--border)",
                  opacity: active ? 1 : 0.7,
                }}
              >
                <div
                  className="grid size-10 shrink-0 place-items-center rounded-lg"
                  style={{
                    background: active
                      ? "var(--surface-muted)"
                      : "var(--surface)",
                    color: active ? "var(--text)" : "var(--text-muted)",
                  }}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{mod.label}</div>
                      <div
                        className="mt-0.5 text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {mod.description}
                      </div>
                      {count > 0 && !active && (
                        <div
                          className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
                          style={{
                            background: "var(--warning-soft)",
                            color: "var(--warning)",
                          }}
                        >
                          <Info size={10} /> {count} kayıt var, gizleniyor (silinmedi)
                        </div>
                      )}
                    </div>
                    <Toggle
                      checked={active}
                      onChange={() => toggle(mod.key)}
                    />
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="md"
          onPress={submit}
          isDisabled={pending}
        >
          {pending ? "Kaydediliyor…" : "Tercihleri Kaydet"}
        </Button>
      </div>
    </div>
  );
}

function CoreList() {
  const cores = [
    { label: "Anasayfa", description: "KPI ve yaklaşan listeler" },
    { label: "Profiller", description: "Müşteri ve tedarikçi kayıtları" },
    { label: "Alacaklar", description: "Tahsil edilecek tutarlar" },
    { label: "Borçlar", description: "Ödenecek tutarlar" },
  ];
  return (
    <ul
      className="space-y-2 text-sm"
      style={{ color: "var(--text-muted)" }}
    >
      {cores.map((c) => (
        <li key={c.label} className="flex items-baseline gap-2">
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: "var(--positive)" }}
          />
          <span style={{ color: "var(--text)" }} className="font-medium">
            {c.label}
          </span>
          <span className="text-xs">— {c.description}</span>
        </li>
      ))}
    </ul>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors"
      style={{
        background: checked ? "var(--accent)" : "var(--surface-muted)",
        borderColor: checked ? "var(--accent)" : "var(--border-strong)",
      }}
    >
      <span
        className="inline-block size-4 rounded-full transition-transform"
        style={{
          background: "#ffffff",
          transform: checked ? "translateX(20px)" : "translateX(2px)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

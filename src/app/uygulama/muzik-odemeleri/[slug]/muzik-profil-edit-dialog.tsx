"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { DataModal } from "@/components/ui/data-modal";
import {
  Field,
  Label,
  TextInput,
  TextArea,
  Select,
} from "@/components/ui/form-field";
import { MuzikMagaza, muzikMagazaEtiket } from "@/lib/enums";
import { updateMuzikProfil } from "../actions";

interface SanatciOption {
  id: number;
  ad: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  profil: {
    id: number;
    isim: string;
    isbirlikciler: string[];
    magazalar: MuzikMagaza[];
    notlar: string | null;
    sanatcilar: { id: number; ad: string }[];
  };
  /** Org'daki tüm potansiyel sanatçılar (Cari.tip=Harcama, harcamaTuru=Sanatci) */
  tumSanatcilar: SanatciOption[];
}

export function MuzikProfilEditDialog(props: Props) {
  if (!props.open) return null;
  return <Inner {...props} />;
}

function Inner({ onClose, profil, tumSanatcilar }: Omit<Props, "open">) {
  const router = useRouter();
  const [isim, setIsim] = useState(profil.isim);
  const [sanatciIds, setSanatciIds] = useState<number[]>(
    profil.sanatcilar.map((s) => s.id),
  );
  const [isbirlikciler, setIsbirlikciler] = useState(
    profil.isbirlikciler.join("\n"),
  );
  const [magazalar, setMagazalar] = useState<MuzikMagaza[]>(profil.magazalar);
  const [notlar, setNotlar] = useState(profil.notlar ?? "");
  const [saving, setSaving] = useState(false);

  function toggleMagaza(m: MuzikMagaza) {
    setMagazalar((prev) =>
      prev.includes(m) ? prev.filter((p) => p !== m) : [...prev, m],
    );
  }

  function toggleSanatci(id: number) {
    setSanatciIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    if (!isim.trim()) {
      toast.error("İsim zorunlu");
      return;
    }
    if (sanatciIds.length === 0) {
      toast.error("En az bir sanatçı seçilmeli");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("isim", isim.trim());
    fd.set("sanatciCariIds", sanatciIds.join(","));
    fd.set("isbirlikciler", isbirlikciler);
    fd.set("magazalar", magazalar.join(","));
    if (notlar.trim()) fd.set("notlar", notlar.trim());

    const r = await updateMuzikProfil(profil.id, fd);
    setSaving(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Müzik profili güncellendi");
    router.refresh();
    onClose();
  }

  const allPlatforms = Object.values(MuzikMagaza) as MuzikMagaza[];

  return (
    <DataModal
      isOpen={true}
      onClose={onClose}
      size="xl"
      title="Müzik Profilini Düzenle"
      description={profil.isim}
      footer={
        <>
          <Button variant="ghost" size="md" onPress={onClose} isDisabled={saving}>
            Vazgeç
          </Button>
          <Button variant="primary" size="md" onPress={handleSave} isDisabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field>
          <Label htmlFor="m-isim" required>
            İsim
          </Label>
          <TextInput
            id="m-isim"
            value={isim}
            onChange={(e) => setIsim(e.target.value)}
            placeholder="Şarkı / albüm adı"
          />
        </Field>

        <Field>
          <Label htmlFor="m-sanatci" required>
            Sanatçılar
          </Label>
          <div
            className="rounded-lg border p-2 max-h-48 overflow-y-auto"
            style={{
              background: "var(--surface-muted)",
              borderColor: "var(--border)",
            }}
          >
            {tumSanatcilar.length === 0 ? (
              <p
                className="px-2 py-2 text-xs"
                style={{ color: "var(--text-soft)" }}
              >
                Sanatçı yok — Profiller sayfasından ekleyin (tip=Harcama,
                harcamaTuru=Sanatci)
              </p>
            ) : (
              tumSanatcilar.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={sanatciIds.includes(s.id)}
                    onChange={() => toggleSanatci(s.id)}
                    className="size-4 rounded"
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span>{s.ad}</span>
                </label>
              ))
            )}
          </div>
        </Field>

        <Field>
          <Label htmlFor="m-isbirlikci">İşbirlikçiler (her satıra bir)</Label>
          <TextArea
            id="m-isbirlikci"
            rows={2}
            value={isbirlikciler}
            onChange={(e) => setIsbirlikciler(e.target.value)}
            placeholder="Örn: feat. Drake&#10;prod. by 808Melo"
          />
        </Field>

        <Field>
          <Label htmlFor="m-magaza">Yayın Mağazaları</Label>
          <div className="flex flex-wrap gap-1.5">
            {allPlatforms.map((m) => {
              const active = magazalar.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMagaza(m)}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors"
                  style={{
                    background: active ? "var(--accent)" : "var(--surface-muted)",
                    borderColor: active ? "var(--accent)" : "var(--border)",
                    color: active ? "#fff" : "var(--text-muted)",
                  }}
                >
                  {muzikMagazaEtiket[m]}
                </button>
              );
            })}
          </div>
        </Field>

        <Field>
          <Label htmlFor="m-notlar">Notlar</Label>
          <TextArea
            id="m-notlar"
            rows={2}
            value={notlar}
            onChange={(e) => setNotlar(e.target.value)}
            placeholder="Sözleşme şartları, label notları, vs."
          />
        </Field>
      </div>
    </DataModal>
  );
}

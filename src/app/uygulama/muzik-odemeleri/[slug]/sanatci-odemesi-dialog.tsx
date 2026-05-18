"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
import { DataModal } from "@/components/ui/data-modal";
import { Field, Label, TextInput, TextArea, Select } from "@/components/ui/form-field";
import { createSanatciOdemesi } from "../actions";
import type { KasaOption } from "./muzik-detail";

interface Props {
  open: boolean;
  onClose: () => void;
  muzikProfilId: number;
  muzikIsim: string;
  sanatcilar: { id: number; ad: string }[];
  kasalar: KasaOption[];
}

export function SanatciOdemesiDialog(props: Props) {
  if (!props.open) return null;
  return <SanatciOdemesiDialogInner {...props} onClose={props.onClose} />;
}

function SanatciOdemesiDialogInner({
  onClose,
  muzikProfilId,
  muzikIsim,
  sanatcilar,
  kasalar,
}: Omit<Props, "open">) {
  const router = useRouter();
  const bugun = new Date().toISOString().slice(0, 10);
  const varsayilanKasa = kasalar.find((k) => k.varsayilan) ?? kasalar[0];
  const [tarih, setTarih] = useState(bugun);
  const [sanatciCariId, setSanatciCariId] = useState<string>(
    sanatcilar[0] ? String(sanatcilar[0].id) : "",
  );
  const [tutar, setTutar] = useState("");
  const [kasaId, setKasaId] = useState<string>(
    varsayilanKasa ? String(varsayilanKasa.id) : "",
  );
  const [not, setNot] = useState("");
  const [borclaraYansit, setBorclaraYansit] = useState(true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!sanatciCariId) {
      toast.error("Sanatçı seçilmeli");
      return;
    }
    if (!tutar || Number(tutar) <= 0) {
      toast.error("Tutar girilmeli");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("muzikProfilId", String(muzikProfilId));
    fd.set("sanatciCariId", sanatciCariId);
    fd.set("tarih", tarih);
    fd.set("tutar", tutar);
    fd.set("paraBirimi", "USD");
    if (kasaId) fd.set("kasaId", kasaId);
    fd.set("borclaraYansit", borclaraYansit ? "true" : "false");
    if (not) fd.set("not", not);

    const r = await createSanatciOdemesi(fd);
    setSaving(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Sanatçı ödemesi eklendi");
    router.refresh();
    onClose();
  }

  return (
    <DataModal
      isOpen={true}
      onClose={onClose}
      size="xl"
      title="Sanatçı Ödemesi"
      description={muzikIsim}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="md" onPress={onClose} isDisabled={saving}>
            Vazgeç
          </Button>
          <Button variant="primary" size="md" onPress={handleSave} isDisabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      }
    >
      {sanatcilar.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Bu müziğe bağlı sanatçı yok. Önce müzik profilini düzenleyip sanatçı
          ekle veya Profiller sayfasından tip=Harcama / harcamaTürü=Sanatçı
          olarak yeni profil oluştur.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 grid-cols-2">
            <Field>
              <Label htmlFor="oTarih" required>
                Tarih
              </Label>
              <TextInput
                id="oTarih"
                name="tarih"
                type="date"
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
              />
            </Field>

            <Field>
              <Label htmlFor="oTutar" hint="USD" required>
                Tutar
              </Label>
              <TextInput
                id="oTutar"
                name="tutar"
                type="number"
                placeholder="500"
                value={tutar}
                onChange={(e) => setTutar(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-3 grid-cols-2">
            <Field>
              <Label htmlFor="oSanatci" required>
                Sanatçı
              </Label>
              <Select
                id="oSanatci"
                name="sanatciId"
                value={sanatciCariId}
                onChange={(e) => setSanatciCariId(e.target.value)}
              >
                {sanatcilar.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.ad}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label htmlFor="oKasa" hint="opsiyonel">
                Kasa
              </Label>
              <Select
                id="oKasa"
                name="kasaId"
                value={kasaId}
                onChange={(e) => setKasaId(e.target.value)}
              >
                <option value="">— Yok —</option>
                {kasalar.map((k) => (
                  <option key={k.id} value={String(k.id)}>
                    {k.ad}
                    {k.varsayilan ? " · varsayılan" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field>
            <Label htmlFor="oNot" hint="opsiyonel">
              Not
            </Label>
            <TextArea
              id="oNot"
              name="not"
              rows={2}
              placeholder="Şubat payout, bonus, vs."
              value={not}
              onChange={(e) => setNot(e.target.value)}
            />
          </Field>

          <button
            type="button"
            onClick={() => setBorclaraYansit(!borclaraYansit)}
            className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors"
            style={{
              background: borclaraYansit
                ? "var(--warning-soft)"
                : "var(--surface-muted)",
              borderColor: borclaraYansit
                ? "color-mix(in oklch, var(--warning) 30%, transparent)"
                : "var(--border)",
            }}
          >
            <span
              aria-hidden
              className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-sm border-2"
              style={{
                background: borclaraYansit ? "var(--warning)" : "transparent",
                borderColor: borclaraYansit
                  ? "var(--warning)"
                  : "var(--border-strong)",
                color: "#fff",
              }}
            >
              {borclaraYansit && "✓"}
            </span>
            <div className="flex-1">
              <div
                className="flex items-center gap-1.5 text-sm font-medium"
                style={{
                  color: borclaraYansit ? "var(--warning)" : "var(--text)",
                }}
              >
                <Link2 size={13} />
                Borçlar&apos;a da kaydet
              </div>
              <div
                className="mt-0.5 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Bu ödeme sanatçının `Cari` kaydı üzerinde Borçlar/Hareketler
                tablosuna düşer.
              </div>
            </div>
          </button>
        </div>
      )}
    </DataModal>
  );
}

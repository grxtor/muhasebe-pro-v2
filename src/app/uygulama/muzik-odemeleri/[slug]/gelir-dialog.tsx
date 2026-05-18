"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { DataModal } from "@/components/ui/data-modal";
import { Field, Label, TextInput, TextArea, Select } from "@/components/ui/form-field";
import { MuzikMagaza, muzikMagazaEtiket } from "@/lib/enums";
import { createMuzikGelir } from "../actions";

interface Props {
  open: boolean;
  onClose: () => void;
  muzikProfilId: number;
  muzikIsim: string;
  bagliMagazalar: MuzikMagaza[];
}

export function GelirDialog({
  open,
  onClose,
  muzikProfilId,
  muzikIsim,
  bagliMagazalar,
}: Props) {
  if (!open) return null;
  return (
    <GelirDialogInner
      onClose={onClose}
      muzikProfilId={muzikProfilId}
      muzikIsim={muzikIsim}
      bagliMagazalar={bagliMagazalar}
    />
  );
}

function GelirDialogInner({
  onClose,
  muzikProfilId,
  muzikIsim,
  bagliMagazalar,
}: {
  onClose: () => void;
  muzikProfilId: number;
  muzikIsim: string;
  bagliMagazalar: MuzikMagaza[];
}) {
  const router = useRouter();
  const bugun = new Date().toISOString().slice(0, 10);
  const [tarih, setTarih] = useState(bugun);
  const [platform, setPlatform] = useState<string>("");
  const [tutar, setTutar] = useState("");
  const [not, setNot] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!tutar || Number(tutar) <= 0) {
      toast.error("Tutar girilmeli");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("muzikProfilId", String(muzikProfilId));
    fd.set("tarih", tarih);
    fd.set("tutar", tutar);
    fd.set("paraBirimi", "USD");
    if (platform) fd.set("platform", platform);
    if (not) fd.set("not", not);

    const r = await createMuzikGelir(fd);
    setSaving(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Gelir eklendi");
    router.refresh();
    onClose();
  }

  const onerilenler = bagliMagazalar.length > 0 ? bagliMagazalar : null;

  return (
    <DataModal
      isOpen={true}
      onClose={onClose}
      size="xl"
      title="Yeni Gelir"
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
      <div className="space-y-3">
        <div className="grid gap-3 grid-cols-2">
          <Field>
            <Label htmlFor="tarih" required>
              Tarih
            </Label>
            <TextInput
              id="tarih"
              name="tarih"
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
            />
          </Field>

          <Field>
            <Label htmlFor="tutar" hint="USD" required>
              Tutar
            </Label>
            <TextInput
              id="tutar"
              name="tutar"
              type="number"
              placeholder="1200"
              value={tutar}
              onChange={(e) => setTutar(e.target.value)}
            />
          </Field>
        </div>

        <Field>
          <Label htmlFor="platform" hint="opsiyonel">
            Platform
          </Label>
          <Select
            id="platform"
            name="platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="">— Belirsiz —</option>
            {onerilenler &&
              onerilenler.map((m) => (
                <option key={`o-${m}`} value={m}>
                  {muzikMagazaEtiket[m]} (bu müziğe bağlı)
                </option>
              ))}
            {Object.values(MuzikMagaza)
              .filter((m) => !onerilenler || !onerilenler.includes(m))
              .map((m) => (
                <option key={m} value={m}>
                  {muzikMagazaEtiket[m]}
                </option>
              ))}
          </Select>
        </Field>

        <Field>
          <Label htmlFor="gelirNot" hint="opsiyonel">
            Not
          </Label>
          <TextArea
            id="gelirNot"
            name="not"
            rows={2}
            placeholder="Şubat Spotify payout, content ID claim, vs."
            value={not}
            onChange={(e) => setNot(e.target.value)}
          />
        </Field>
      </div>
    </DataModal>
  );
}

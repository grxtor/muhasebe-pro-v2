"use client";

import { useTransition } from "react";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { DataModal } from "@/components/ui/data-modal";
import {
  Field,
  Label,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui/form-field";
import {
  TekrarSiklik,
  tekrarSiklikEtiket,
  TekrarTip,
  tekrarTipEtiket,
  OdemeYonu,
  odemeYonuEtiket,
} from "@/lib/enums";
import { createTekrarlayan, updateTekrarlayan } from "./actions";
import type { TekrarlayanRow, CariRef } from "./tekrarlayan-list";

interface Props {
  isOpen: boolean;
  editing: TekrarlayanRow | null;
  cariler: CariRef[];
  onClose: () => void;
  onSaved: () => void;
}

export function TekrarlayanDialog({
  isOpen,
  editing,
  cariler,
  onClose,
  onSaved,
}: Props) {
  const isEdit = editing !== null;
  const [pending, start] = useTransition();

  async function submit(formData: FormData) {
    const r = isEdit
      ? await updateTekrarlayan(editing.id, formData)
      : await createTekrarlayan(formData);
    if (r.ok) {
      toast.success(isEdit ? "Şablon güncellendi" : "Şablon oluşturuldu");
      onSaved();
    } else toast.error(r.error);
  }

  const formKey = `${isEdit ? editing.id : "new"}-${isOpen}`;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <DataModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Düzenle: ${editing.ad}` : "Yeni Tekrarlayan Kayıt"}
      description="Şablon oluştur, sıklığa göre fatura / alacak / borç otomatik üretilsin"
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="md" onPress={onClose} isDisabled={pending}>
            İptal
          </Button>
          <Button
            type="submit"
            form={formKey}
            variant="primary"
            size="md"
            isDisabled={pending}
          >
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </>
      }
    >
      <form
        id={formKey}
        action={(fd) => start(() => void submit(fd))}
        className="space-y-4"
      >
        <Field>
          <Label htmlFor="ad" required>
            Şablon Adı
          </Label>
          <TextInput
            id="ad"
            name="ad"
            required
            minLength={2}
            defaultValue={editing?.ad ?? ""}
            placeholder="ör. Ofis Kirası, İnternet, Maaş - Ahmet Bey"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="tip" required>
              Üretilecek Kayıt Tipi
            </Label>
            <Select
              id="tip"
              name="tip"
              defaultValue={editing?.tip ?? TekrarTip.OdemeNotu}
              required
            >
              <option value={TekrarTip.OdemeNotu}>
                {tekrarTipEtiket.OdemeNotu}
              </option>
              <option value={TekrarTip.Fatura}>
                {tekrarTipEtiket.Fatura}
              </option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="yon" required>
              Yön
            </Label>
            <Select
              id="yon"
              name="yon"
              defaultValue={editing?.yon ?? OdemeYonu.Borc}
              required
            >
              <option value={OdemeYonu.Alacak}>
                {odemeYonuEtiket.Alacak} (gelir)
              </option>
              <option value={OdemeYonu.Borc}>
                {odemeYonuEtiket.Borc} (gider)
              </option>
            </Select>
          </Field>
        </div>

        <Field>
          <Label htmlFor="cariId" required>
            Profil
          </Label>
          <Select
            id="cariId"
            name="cariId"
            required
            defaultValue={editing?.cariId ?? ""}
          >
            <option value="">— seçin —</option>
            {cariler.map((c) => (
              <option key={c.id} value={c.id}>
                {c.kod} — {c.unvan}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <Label htmlFor="tutar" required hint="₺">
              Tutar
            </Label>
            <TextInput
              id="tutar"
              name="tutar"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={editing?.tutar ?? ""}
            />
          </Field>
          <Field>
            <Label htmlFor="kdvOrani" hint="%">
              KDV
            </Label>
            <TextInput
              id="kdvOrani"
              name="kdvOrani"
              type="number"
              step="0.1"
              min="0"
              max="100"
              defaultValue={editing?.kdvOrani ?? 20}
            />
          </Field>
          <Field>
            <Label htmlFor="vadeGun" hint="üretim sonrası">
              Vade (gün)
            </Label>
            <TextInput
              id="vadeGun"
              name="vadeGun"
              type="number"
              min="0"
              max="365"
              defaultValue={editing?.vadeGun ?? 30}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <Label htmlFor="siklik" required>
              Sıklık
            </Label>
            <Select
              id="siklik"
              name="siklik"
              required
              defaultValue={editing?.siklik ?? TekrarSiklik.Aylik}
            >
              {Object.entries(tekrarSiklikEtiket).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="baslangicTarihi" required>
              Başlangıç
            </Label>
            <TextInput
              id="baslangicTarihi"
              name="baslangicTarihi"
              type="date"
              required
              defaultValue={
                isEdit ? editing.baslangicTarihi.slice(0, 10) : today
              }
            />
          </Field>
          <Field>
            <Label htmlFor="bitisTarihi" hint="opsiyonel">
              Bitiş
            </Label>
            <TextInput
              id="bitisTarihi"
              name="bitisTarihi"
              type="date"
              defaultValue={
                editing?.bitisTarihi
                  ? editing.bitisTarihi.slice(0, 10)
                  : ""
              }
            />
          </Field>
        </div>

        <Field>
          <Label htmlFor="aciklama">Açıklama</Label>
          <TextArea
            id="aciklama"
            name="aciklama"
            rows={2}
            defaultValue={editing?.aciklama ?? ""}
            placeholder="Üretilen kayıtların açıklama alanı"
          />
        </Field>

        <Field>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="aktif"
              value="true"
              defaultChecked={editing?.aktif ?? true}
              className="size-4 rounded"
              style={{ accentColor: "var(--accent)" }}
            />
            <span>Aktif (üretime hazır)</span>
          </label>
        </Field>

        <input type="hidden" name="paraBirimi" value="TRY" />
      </form>
    </DataModal>
  );
}

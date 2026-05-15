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
  OdemeYonu,
  OdemeDurumu,
  odemeDurumuEtiket,
} from "@/lib/enums";
import {
  createOdemeNotu,
  updateOdemeNotu,
} from "./odeme-notu-actions";
import type { OdemeNotuRow, CariRef } from "./odeme-notu-list";

interface Props {
  isOpen: boolean;
  yon: typeof OdemeYonu.Alacak | typeof OdemeYonu.Borc;
  notu: OdemeNotuRow | null;
  cariler: CariRef[];
  onClose: () => void;
  onSaved: () => void;
}

export function OdemeNotuDialog({
  isOpen,
  yon,
  notu,
  cariler,
  onClose,
  onSaved,
}: Props) {
  const isEdit = notu !== null;
  const isAlacak = yon === OdemeYonu.Alacak;
  const labelTekil = isAlacak ? "Alacak" : "Borç";
  const [pending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    // Hidden yon ekle
    formData.set("yon", yon);
    const result = isEdit
      ? await updateOdemeNotu(notu.id, formData)
      : await createOdemeNotu(formData);
    if (result.ok) {
      toast.success(
        isEdit
          ? `${labelTekil} güncellendi`
          : `${labelTekil} oluşturuldu`,
      );
      onSaved();
    } else {
      toast.error(result.error);
    }
  }

  function onAction(formData: FormData) {
    startTransition(() => {
      void handleSubmit(formData);
    });
  }

  const formKey = `${isEdit ? notu.id : "new"}-${isOpen}-${yon}`;
  const defaultVade = isoDate(
    isEdit
      ? notu.vadeTarihi
      : new Date(Date.now() + 30 * 86_400_000).toISOString(),
  );

  return (
    <DataModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEdit ? `${labelTekil} Düzenle: ${notu.baslik}` : `Yeni ${labelTekil}`
      }
      description={
        isAlacak
          ? "Tahsil edilecek tutar"
          : "Ödenecek tutar"
      }
      size="lg"
      footer={
        <>
          <Button
            variant="ghost"
            size="md"
            onPress={onClose}
            isDisabled={pending}
          >
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
      <form id={formKey} action={onAction} className="space-y-4">
        <Field>
          <Label htmlFor="cariId" required>
            Profil (Müşteri / Tedarikçi)
          </Label>
          <Select
            id="cariId"
            name="cariId"
            required
            defaultValue={notu?.cariId ?? ""}
          >
            <option value="">— seçin —</option>
            {cariler.map((c) => (
              <option key={c.id} value={c.id}>
                {c.kod} — {c.unvan}
              </option>
            ))}
          </Select>
          {cariler.length === 0 && (
            <p className="mt-1 text-xs" style={{ color: "var(--warning)" }}>
              Önce bir profil eklemelisiniz. Profiller sayfasından ekleyin.
            </p>
          )}
        </Field>

        <Field>
          <Label htmlFor="baslik" required>
            Başlık
          </Label>
          <TextInput
            id="baslik"
            name="baslik"
            required
            minLength={2}
            defaultValue={notu?.baslik ?? ""}
            placeholder={
              isAlacak ? "ör. Mart faturası" : "ör. Kira ödemesi"
            }
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
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
              defaultValue={notu?.tutar ?? ""}
            />
          </Field>
          <Field>
            <Label htmlFor="vadeTarihi" required>
              Vade Tarihi
            </Label>
            <TextInput
              id="vadeTarihi"
              name="vadeTarihi"
              type="date"
              required
              defaultValue={defaultVade}
            />
          </Field>
        </div>

        {isEdit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="odenenTutar" hint="₺">
                Ödenen Tutar
              </Label>
              <TextInput
                id="odenenTutar"
                name="odenenTutar"
                type="number"
                step="0.01"
                min="0"
                defaultValue={notu.odenenTutar}
              />
            </Field>
            <Field>
              <Label htmlFor="durum">Durum</Label>
              <Select
                id="durum"
                name="durum"
                defaultValue={notu.durum}
              >
                <option value={OdemeDurumu.Beklemede}>
                  {odemeDurumuEtiket.Beklemede}
                </option>
                <option value={OdemeDurumu.KismiOdendi}>
                  {odemeDurumuEtiket.KismiOdendi}
                </option>
                <option value={OdemeDurumu.Odendi}>
                  {odemeDurumuEtiket.Odendi}
                </option>
                <option value={OdemeDurumu.Iptal}>
                  {odemeDurumuEtiket.Iptal}
                </option>
              </Select>
            </Field>
          </div>
        )}

        <Field>
          <Label htmlFor="aciklama">Açıklama</Label>
          <TextArea
            id="aciklama"
            name="aciklama"
            rows={3}
            defaultValue={notu?.aciklama ?? ""}
            placeholder="Ek not, referans no, vs."
          />
        </Field>

        <input type="hidden" name="paraBirimi" value="TRY" />
      </form>
    </DataModal>
  );
}

function isoDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

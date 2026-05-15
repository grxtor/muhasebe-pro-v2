"use client";

import { useState, useTransition } from "react";
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
import { CariTipi, cariTipiEtiket } from "@/lib/enums";
import { createProfil, updateProfil } from "./actions";
import type { ProfilRow } from "./profil-list";

interface Props {
  isOpen: boolean;
  profil: ProfilRow | null;
  sonrakiKod: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ProfilDialog({
  isOpen,
  profil,
  sonrakiKod,
  onClose,
  onSaved,
}: Props) {
  const isEdit = profil !== null;
  const [pending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    const result = isEdit
      ? await updateProfil(profil.id, formData)
      : await createProfil(formData);
    if (result.ok) {
      toast.success(isEdit ? "Profil güncellendi" : "Profil oluşturuldu");
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

  // Anahtar — modal her açılışta input'ları sıfırla
  const formKey = `${isEdit ? profil.id : "new"}-${isOpen}`;

  return (
    <DataModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Düzenle: ${profil.unvan}` : "Yeni Profil"}
      description={
        isEdit
          ? "Profil bilgilerini güncelleyin"
          : "Müşteri veya tedarikçi ekleyin"
      }
      size="xl"
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
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <Label htmlFor="kod" required>
              Kod
            </Label>
            <TextInput
              id="kod"
              name="kod"
              required
              defaultValue={profil?.kod ?? sonrakiKod}
              placeholder="CR-001"
            />
          </Field>
          <Field className="sm:col-span-2">
            <Label htmlFor="unvan" required>
              Ünvan / Ad Soyad
            </Label>
            <TextInput
              id="unvan"
              name="unvan"
              required
              minLength={2}
              defaultValue={profil?.unvan ?? ""}
              placeholder="Örnek Limited"
            />
          </Field>
        </div>

        <Field>
          <Label htmlFor="tip">Tip</Label>
          <Select
            id="tip"
            name="tip"
            defaultValue={profil?.tip ?? CariTipi.Musteri}
          >
            <option value={CariTipi.Musteri}>{cariTipiEtiket.Musteri}</option>
            <option value={CariTipi.Tedarikci}>
              {cariTipiEtiket.Tedarikci}
            </option>
            <option value={CariTipi.HerIkisi}>
              {cariTipiEtiket.HerIkisi}
            </option>
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <Label htmlFor="vergiNo">Vergi No</Label>
            <TextInput
              id="vergiNo"
              name="vergiNo"
              defaultValue={profil?.vergiNo ?? ""}
              placeholder="1234567890"
            />
          </Field>
          <Field>
            <Label htmlFor="vergiDairesi">Vergi Dairesi</Label>
            <TextInput
              id="vergiDairesi"
              name="vergiDairesi"
              defaultValue={profil?.vergiDairesi ?? ""}
              placeholder="Şişli"
            />
          </Field>
          <Field>
            <Label htmlFor="tcKimlikNo">T.C. Kimlik</Label>
            <TextInput
              id="tcKimlikNo"
              name="tcKimlikNo"
              defaultValue={profil?.tcKimlikNo ?? ""}
              placeholder="12345678901"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="telefon">Telefon</Label>
            <TextInput
              id="telefon"
              name="telefon"
              type="tel"
              defaultValue={profil?.telefon ?? ""}
              placeholder="0532 000 00 00"
            />
          </Field>
          <Field>
            <Label htmlFor="email">E-posta</Label>
            <TextInput
              id="email"
              name="email"
              type="email"
              defaultValue={profil?.email ?? ""}
              placeholder="iletisim@firma.com"
            />
          </Field>
        </div>

        <Field>
          <Label htmlFor="adres">Adres</Label>
          <TextArea
            id="adres"
            name="adres"
            rows={2}
            defaultValue={profil?.adres ?? ""}
            placeholder="Açık adres..."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="sehir">Şehir</Label>
            <TextInput
              id="sehir"
              name="sehir"
              defaultValue={profil?.sehir ?? ""}
              placeholder="İstanbul"
            />
          </Field>
          <Field>
            <Label htmlFor="acilisBakiyesi" hint="₺">
              Açılış Bakiyesi
            </Label>
            <TextInput
              id="acilisBakiyesi"
              name="acilisBakiyesi"
              type="number"
              step="0.01"
              defaultValue={profil?.acilisBakiyesi ?? "0"}
            />
          </Field>
        </div>

        <Field>
          <Label htmlFor="notlar">Notlar</Label>
          <TextArea
            id="notlar"
            name="notlar"
            rows={2}
            defaultValue={profil?.notlar ?? ""}
          />
        </Field>

        <Field>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="aktif"
              value="true"
              defaultChecked={profil?.aktif ?? true}
              className="size-4 rounded"
              style={{ accentColor: "var(--brand)" }}
            />
            <span>Aktif</span>
          </label>
        </Field>
      </form>
    </DataModal>
  );
}

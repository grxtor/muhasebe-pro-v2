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
  HatirlaticiOncelik,
  hatirlaticiOncelikEtiket,
} from "@/lib/enums";
import { createHatirlatici, updateHatirlatici } from "./actions";
import type { HatirlaticiRow, CariRef } from "./hatirlatici-list";

interface Props {
  isOpen: boolean;
  editing: HatirlaticiRow | null;
  cariler: CariRef[];
  onClose: () => void;
  onSaved: () => void;
}

export function HatirlaticiDialog({
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
      ? await updateHatirlatici(editing.id, formData)
      : await createHatirlatici(formData);
    if (r.ok) {
      toast.success(isEdit ? "Hatırlatıcı güncellendi" : "Hatırlatıcı eklendi");
      onSaved();
    } else toast.error(r.error);
  }

  const formKey = `${isEdit ? editing.id : "new"}-${isOpen}`;
  const defaultDate = new Date(Date.now() + 7 * 86_400_000)
    .toISOString()
    .slice(0, 16);

  return (
    <DataModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Düzenle: ${editing.baslik}` : "Yeni Hatırlatıcı"}
      size="md"
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
      <form
        id={formKey}
        action={(fd) => start(() => void submit(fd))}
        className="space-y-4"
      >
        <Field>
          <Label htmlFor="baslik" required>
            Başlık
          </Label>
          <TextInput
            id="baslik"
            name="baslik"
            required
            minLength={2}
            defaultValue={editing?.baslik ?? ""}
            placeholder="ör. Ahmet Bey'i ara, faturayı gönder"
          />
        </Field>

        <Field>
          <Label htmlFor="aciklama">Açıklama</Label>
          <TextArea
            id="aciklama"
            name="aciklama"
            rows={3}
            defaultValue={editing?.aciklama ?? ""}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="hatirlatmaTarihi" required>
              Hatırlatma Tarihi
            </Label>
            <TextInput
              id="hatirlatmaTarihi"
              name="hatirlatmaTarihi"
              type="datetime-local"
              required
              defaultValue={
                isEdit
                  ? editing.hatirlatmaTarihi.slice(0, 16)
                  : defaultDate
              }
            />
          </Field>
          <Field>
            <Label htmlFor="oncelik">Öncelik</Label>
            <Select
              id="oncelik"
              name="oncelik"
              defaultValue={editing?.oncelik ?? HatirlaticiOncelik.Normal}
            >
              <option value={HatirlaticiOncelik.Dusuk}>
                {hatirlaticiOncelikEtiket.Dusuk}
              </option>
              <option value={HatirlaticiOncelik.Normal}>
                {hatirlaticiOncelikEtiket.Normal}
              </option>
              <option value={HatirlaticiOncelik.Yuksek}>
                {hatirlaticiOncelikEtiket.Yuksek}
              </option>
            </Select>
          </Field>
        </div>

        <Field>
          <Label htmlFor="cariId" hint="opsiyonel">
            İlgili Profil
          </Label>
          <Select
            id="cariId"
            name="cariId"
            defaultValue={editing?.cari?.id ?? ""}
          >
            <option value="">— hiçbiri —</option>
            {cariler.map((c) => (
              <option key={c.id} value={c.id}>
                {c.kod} — {c.unvan}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </DataModal>
  );
}

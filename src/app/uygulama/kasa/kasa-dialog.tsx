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
import { createKasa, updateKasa } from "./actions";
import type { KasaRow } from "./kasa-list";

const PARA_BIRIMLERI = [
  { kod: "TRY", ad: "Türk Lirası (₺)" },
  { kod: "USD", ad: "Amerikan Doları ($)" },
  { kod: "EUR", ad: "Euro (€)" },
  { kod: "GBP", ad: "İngiliz Sterlini (£)" },
];

interface Props {
  isOpen: boolean;
  editing: KasaRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export function KasaDialog({ isOpen, editing, onClose, onSaved }: Props) {
  const isEdit = editing !== null;
  const [pending, start] = useTransition();

  async function submit(formData: FormData) {
    const r = isEdit
      ? await updateKasa(editing.id, formData)
      : await createKasa(formData);
    if (r.ok) {
      toast.success(isEdit ? "Kasa güncellendi" : "Kasa eklendi");
      onSaved();
    } else {
      toast.error(r.error);
    }
  }

  const formKey = `kasa-${isEdit ? editing.id : "new"}-${isOpen}`;

  return (
    <DataModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Düzenle: ${editing.ad}` : "Yeni Kasa"}
      description={
        isEdit
          ? "Kasa bilgilerini güncelle. Açılış bakiyesi değiştirilebilir."
          : "Yeni kasa ekle. Her para birimi için ayrı kasa açabilirsin."
      }
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
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <Field>
            <Label htmlFor="ad" required>
              Kasa Adı
            </Label>
            <TextInput
              id="ad"
              name="ad"
              required
              minLength={2}
              maxLength={100}
              defaultValue={editing?.ad ?? ""}
              placeholder="ör. TL Ana Kasa"
            />
          </Field>
          <Field>
            <Label htmlFor="paraBirimi" required>
              Para Birimi
            </Label>
            <Select
              id="paraBirimi"
              name="paraBirimi"
              defaultValue={editing?.paraBirimi ?? "TRY"}
            >
              {PARA_BIRIMLERI.map((p) => (
                <option key={p.kod} value={p.kod}>
                  {p.ad}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field>
          <Label htmlFor="acilis" hint="başlangıç bakiyesi">
            Açılış Bakiyesi
          </Label>
          <TextInput
            id="acilis"
            name="acilis"
            type="number"
            step="0.01"
            defaultValue={editing?.acilis ?? "0"}
            placeholder="0,00"
          />
        </Field>

        <Field>
          <Label htmlFor="aciklama">Açıklama</Label>
          <TextArea
            id="aciklama"
            name="aciklama"
            rows={2}
            defaultValue={editing?.aciklama ?? ""}
            placeholder="Bu kasanın amacı / not"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
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
              <span>Aktif</span>
            </label>
          </Field>
          <Field>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="varsayilan"
                value="true"
                defaultChecked={editing?.varsayilan ?? false}
                className="size-4 rounded"
                style={{ accentColor: "var(--accent)" }}
              />
              <span>Varsayılan kasa</span>
            </label>
          </Field>
        </div>
      </form>
    </DataModal>
  );
}

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
import { createUrun, updateUrun } from "./actions";
import type { UrunRow } from "./urun-list";

interface Props {
  isOpen: boolean;
  editing: UrunRow | null;
  kategoriler: string[];
  sonrakiKod: string;
  onClose: () => void;
  onSaved: () => void;
}

const BIRIMLER = ["Adet", "Kg", "Gr", "Lt", "Mt", "M2", "M3", "Saat", "Paket"];

export function UrunDialog({
  isOpen,
  editing,
  kategoriler,
  sonrakiKod,
  onClose,
  onSaved,
}: Props) {
  const isEdit = editing !== null;
  const [pending, start] = useTransition();

  async function submit(formData: FormData) {
    const r = isEdit
      ? await updateUrun(editing.id, formData)
      : await createUrun(formData);
    if (r.ok) {
      toast.success(isEdit ? "Ürün güncellendi" : "Ürün eklendi");
      onSaved();
    } else toast.error(r.error);
  }

  const formKey = `${isEdit ? editing.id : "new"}-${isOpen}`;

  return (
    <DataModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Düzenle: ${editing.ad}` : "Yeni Ürün"}
      description={
        isEdit
          ? "Ürün bilgilerini güncelle. Stok yalnızca stok hareketleriyle değişir."
          : "Yeni ürün ekle. Başlangıç stoğu girebilirsin."
      }
      size="xl"
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
        <div className="grid gap-4 sm:grid-cols-[140px_1fr_140px]">
          <Field>
            <Label htmlFor="kod" required>
              Kod
            </Label>
            <TextInput
              id="kod"
              name="kod"
              required
              defaultValue={editing?.kod ?? sonrakiKod}
            />
          </Field>
          <Field>
            <Label htmlFor="ad" required>
              Ürün Adı
            </Label>
            <TextInput
              id="ad"
              name="ad"
              required
              minLength={2}
              defaultValue={editing?.ad ?? ""}
            />
          </Field>
          <Field>
            <Label htmlFor="birim">Birim</Label>
            <Select
              id="birim"
              name="birim"
              defaultValue={editing?.birim ?? "Adet"}
            >
              {BIRIMLER.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field>
          <Label htmlFor="aciklama">Açıklama</Label>
          <TextArea
            id="aciklama"
            name="aciklama"
            rows={2}
            defaultValue={editing?.aciklama ?? ""}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <Label htmlFor="satisFiyati" required hint="₺">
              Satış Fiyatı
            </Label>
            <TextInput
              id="satisFiyati"
              name="satisFiyati"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={editing?.satisFiyati ?? ""}
            />
          </Field>
          <Field>
            <Label htmlFor="alisFiyati" hint="₺ opsiyonel">
              Alış Fiyatı
            </Label>
            <TextInput
              id="alisFiyati"
              name="alisFiyati"
              type="number"
              step="0.01"
              min="0"
              defaultValue={editing?.alisFiyati ?? ""}
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
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {!isEdit && (
            <Field>
              <Label htmlFor="stok">Başlangıç Stoğu</Label>
              <TextInput
                id="stok"
                name="stok"
                type="number"
                step="0.001"
                min="0"
                defaultValue="0"
              />
            </Field>
          )}
          <Field>
            <Label htmlFor="minStok" hint="uyarı eşiği">
              Min Stok
            </Label>
            <TextInput
              id="minStok"
              name="minStok"
              type="number"
              step="0.001"
              min="0"
              defaultValue={editing?.minStok ?? "0"}
            />
          </Field>
          <Field>
            <Label htmlFor="kategori">Kategori</Label>
            <TextInput
              id="kategori"
              name="kategori"
              list="urun-kategoriler"
              defaultValue={editing?.kategori ?? ""}
              placeholder="ör. Hizmet, Bilgisayar"
            />
            <datalist id="urun-kategoriler">
              {kategoriler.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </Field>
        </div>

        <Field>
          <Label htmlFor="barkod" hint="opsiyonel">
            Barkod
          </Label>
          <TextInput
            id="barkod"
            name="barkod"
            defaultValue={editing?.barkod ?? ""}
            placeholder="8690000000000"
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
            <span>Aktif (satışta)</span>
          </label>
        </Field>

        <input type="hidden" name="paraBirimi" value="TRY" />
      </form>
    </DataModal>
  );
}

"use client";

import { useTransition, useState } from "react";
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
  StokHareketTipi,
  stokHareketTipiEtiket,
} from "@/lib/enums";
import { createStokHareketi } from "./actions";
import type { UrunRow } from "./urun-list";

export function StokHareketDialog({
  urun,
  onClose,
  onSaved,
}: {
  urun: UrunRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, start] = useTransition();
  const [tip, setTip] = useState<string>(StokHareketTipi.Giris);

  async function submit(formData: FormData) {
    if (!urun) return;
    const r = await createStokHareketi(urun.id, formData);
    if (r.ok) {
      toast.success("Stok hareketi kaydedildi");
      onSaved();
    } else toast.error(r.error);
  }

  const formKey = `${urun?.id ?? "x"}-${Date.now()}`;

  return (
    <DataModal
      isOpen={urun !== null}
      onClose={onClose}
      title={urun ? `Stok Hareketi: ${urun.ad}` : ""}
      description={
        urun
          ? `Mevcut: ${parseFloat(urun.stok)} ${urun.birim}`
          : ""
      }
      size="md"
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
      {urun && (
        <form
          id={formKey}
          action={(fd) => start(() => void submit(fd))}
          className="space-y-4"
        >
          <Field>
            <Label htmlFor="tip" required>
              Hareket Tipi
            </Label>
            <Select
              id="tip"
              name="tip"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
            >
              <option value={StokHareketTipi.Giris}>
                {stokHareketTipiEtiket.Giris} (+)
              </option>
              <option value={StokHareketTipi.Cikis}>
                {stokHareketTipiEtiket.Cikis} (−)
              </option>
              <option value={StokHareketTipi.Duzeltme}>
                {stokHareketTipiEtiket.Duzeltme} (sayım sonrası)
              </option>
            </Select>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--text-soft)" }}
            >
              {tip === StokHareketTipi.Duzeltme
                ? "Düzeltme: stok değeri girdiğin miktara EŞİTLENİR (mutlak)"
                : tip === StokHareketTipi.Giris
                ? "Stoğa eklenir"
                : "Stoğtan düşülür"}
            </p>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="miktar" required hint={urun.birim}>
                Miktar
              </Label>
              <TextInput
                id="miktar"
                name="miktar"
                type="number"
                step="0.001"
                min="0.001"
                required
                autoFocus
              />
            </Field>
            <Field>
              <Label htmlFor="birimFiyat" hint="₺ opsiyonel">
                Birim Fiyat
              </Label>
              <TextInput
                id="birimFiyat"
                name="birimFiyat"
                type="number"
                step="0.01"
                min="0"
                defaultValue={
                  tip === StokHareketTipi.Giris
                    ? urun.alisFiyati ?? ""
                    : urun.satisFiyati
                }
              />
            </Field>
          </div>

          <Field>
            <Label htmlFor="belgeNo">Belge No</Label>
            <TextInput
              id="belgeNo"
              name="belgeNo"
              placeholder="Sevk irsaliyesi no, fatura no..."
            />
          </Field>

          <Field>
            <Label htmlFor="notlar">Not</Label>
            <TextArea id="notlar" name="notlar" rows={2} />
          </Field>
        </form>
      )}
    </DataModal>
  );
}

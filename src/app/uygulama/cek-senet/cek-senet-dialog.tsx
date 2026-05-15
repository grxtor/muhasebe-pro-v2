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
  CekSenetTip,
  CekSenetYon,
  CekSenetDurum,
  cekSenetTipEtiket,
  cekSenetYonEtiket,
  cekSenetDurumEtiket,
} from "@/lib/enums";
import { createCekSenet, updateCekSenet } from "./actions";
import type { CekSenetRow, CariRef } from "./cek-senet-list";

interface Props {
  isOpen: boolean;
  editing: CekSenetRow | null;
  cariler: CariRef[];
  onClose: () => void;
  onSaved: () => void;
}

const PARA_BIRIMLERI = ["TRY", "USD", "EUR"] as const;

export function CekSenetDialog({
  isOpen,
  editing,
  cariler,
  onClose,
  onSaved,
}: Props) {
  const isEdit = editing !== null;
  const [pending, start] = useTransition();

  async function submit(formData: FormData) {
    const result = isEdit
      ? await updateCekSenet(editing.id, formData)
      : await createCekSenet(formData);
    if (result.ok) {
      toast.success(
        isEdit ? "Çek/senet güncellendi" : "Çek/senet oluşturuldu",
      );
      onSaved();
    } else {
      toast.error(result.error);
    }
  }

  function onAction(formData: FormData) {
    start(() => {
      void submit(formData);
    });
  }

  const formKey = `cek-senet-${isEdit ? editing.id : "new"}-${isOpen}`;

  // Default tarihler
  const bugun = isoDate(new Date().toISOString());
  const defaultVade = isoDate(
    editing?.vadeTarihi ?? new Date(Date.now() + 30 * 86_400_000).toISOString(),
  );
  const defaultKeside = isoDate(editing?.kesideTarihi ?? new Date().toISOString());
  const defaultTahsil = editing?.tahsilTarihi ? isoDate(editing.tahsilTarihi) : "";

  return (
    <DataModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEdit
          ? `Düzenle: ${editing.belgeNo}`
          : "Yeni Çek / Senet"
      }
      description={
        isEdit
          ? "Çek veya senet bilgilerini güncelleyin"
          : "Alınan veya verilen yeni bir çek / senet kaydı"
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
        {/* Tip / Yön */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="tip" required>
              Tip
            </Label>
            <Select
              id="tip"
              name="tip"
              required
              defaultValue={editing?.tip ?? CekSenetTip.Cek}
            >
              <option value={CekSenetTip.Cek}>
                {cekSenetTipEtiket.Cek}
              </option>
              <option value={CekSenetTip.Senet}>
                {cekSenetTipEtiket.Senet}
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
              required
              defaultValue={editing?.yon ?? CekSenetYon.Alinan}
            >
              <option value={CekSenetYon.Alinan}>
                {cekSenetYonEtiket.Alinan}
              </option>
              <option value={CekSenetYon.Verilen}>
                {cekSenetYonEtiket.Verilen}
              </option>
            </Select>
          </Field>
        </div>

        {/* Cari (opsiyonel) */}
        <Field>
          <Label htmlFor="cariId" hint="opsiyonel">
            Profil (Müşteri / Tedarikçi)
          </Label>
          <Select
            id="cariId"
            name="cariId"
            defaultValue={editing?.cariId ?? ""}
          >
            <option value="">— seçilmedi —</option>
            {cariler.map((c) => (
              <option key={c.id} value={c.id}>
                {c.kod} — {c.unvan}
              </option>
            ))}
          </Select>
        </Field>

        {/* Belge No / Banka / Şube */}
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr]">
          <Field>
            <Label htmlFor="belgeNo" required>
              Belge No
            </Label>
            <TextInput
              id="belgeNo"
              name="belgeNo"
              required
              maxLength={50}
              defaultValue={editing?.belgeNo ?? ""}
              placeholder="ör. 123456"
            />
          </Field>
          <Field>
            <Label htmlFor="bankaAdi">Banka</Label>
            <TextInput
              id="bankaAdi"
              name="bankaAdi"
              maxLength={100}
              defaultValue={editing?.bankaAdi ?? ""}
              placeholder="ör. Garanti BBVA"
            />
          </Field>
          <Field>
            <Label htmlFor="sube">Şube</Label>
            <TextInput
              id="sube"
              name="sube"
              maxLength={100}
              defaultValue={editing?.sube ?? ""}
              placeholder="ör. Levent"
            />
          </Field>
        </div>

        {/* Hesap No / Keşide Yeri */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="hesapNo">Hesap No</Label>
            <TextInput
              id="hesapNo"
              name="hesapNo"
              maxLength={50}
              defaultValue={editing?.hesapNo ?? ""}
              placeholder="ör. 1234-567890"
            />
          </Field>
          <Field>
            <Label htmlFor="keside">Keşide Yeri</Label>
            <TextInput
              id="keside"
              name="keside"
              maxLength={100}
              defaultValue={editing?.keside ?? ""}
              placeholder="ör. İstanbul"
            />
          </Field>
        </div>

        {/* Tutar + Para Birimi */}
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field>
            <Label htmlFor="tutar" required hint="₺ / $ / €">
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
            <Label htmlFor="paraBirimi">Para Birimi</Label>
            <Select
              id="paraBirimi"
              name="paraBirimi"
              defaultValue={editing?.paraBirimi ?? "TRY"}
            >
              {PARA_BIRIMLERI.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Tarihler */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <Label htmlFor="kesideTarihi" required>
              Keşide Tarihi
            </Label>
            <TextInput
              id="kesideTarihi"
              name="kesideTarihi"
              type="date"
              required
              max={bugun}
              defaultValue={defaultKeside}
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
          <Field>
            <Label htmlFor="tahsilTarihi" hint="Tahsil edildiyse">
              Tahsil Tarihi
            </Label>
            <TextInput
              id="tahsilTarihi"
              name="tahsilTarihi"
              type="date"
              defaultValue={defaultTahsil}
            />
          </Field>
        </div>

        {/* Durum */}
        <Field>
          <Label htmlFor="durum">Durum</Label>
          <Select
            id="durum"
            name="durum"
            defaultValue={editing?.durum ?? CekSenetDurum.Portfoyde}
          >
            <option value={CekSenetDurum.Portfoyde}>
              {cekSenetDurumEtiket.Portfoyde}
            </option>
            <option value={CekSenetDurum.TahsileGonderildi}>
              {cekSenetDurumEtiket.TahsileGonderildi}
            </option>
            <option value={CekSenetDurum.Tahsil}>
              {cekSenetDurumEtiket.Tahsil}
            </option>
            <option value={CekSenetDurum.Iade}>
              {cekSenetDurumEtiket.Iade}
            </option>
            <option value={CekSenetDurum.Karsiliksiz}>
              {cekSenetDurumEtiket.Karsiliksiz}
            </option>
            <option value={CekSenetDurum.Iptal}>
              {cekSenetDurumEtiket.Iptal}
            </option>
          </Select>
        </Field>

        {/* Açıklama */}
        <Field>
          <Label htmlFor="aciklama">Açıklama</Label>
          <TextArea
            id="aciklama"
            name="aciklama"
            rows={3}
            maxLength={2000}
            defaultValue={editing?.aciklama ?? ""}
            placeholder="Ek not, referans, vs."
          />
        </Field>
      </form>
    </DataModal>
  );
}

function isoDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

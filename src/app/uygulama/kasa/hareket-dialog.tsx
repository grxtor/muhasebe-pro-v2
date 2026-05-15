"use client";

import { useState, useTransition, useEffect } from "react";
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
import { KasaHareketTip, kasaHareketTipEtiket } from "@/lib/enums";
import { createKasaHareketi } from "./actions";

export interface KasaOption {
  id: number;
  ad: string;
  paraBirimi: string;
}

interface Props {
  /** Açık tutulacak aktif kasaların listesi */
  kasalar: KasaOption[];
  /** Açılışta seçili gelecek kasaId; null ise modal kapalı */
  defaultKasaId: number | null;
  /** Açılışta tip ön-seçimi (detay sayfasında belirli bir tip için açmak) */
  defaultTip?: KasaHareketTip;
  onClose: () => void;
  onSaved: () => void;
}

export function HareketDialog({
  kasalar,
  defaultKasaId,
  defaultTip,
  onClose,
  onSaved,
}: Props) {
  const [pending, start] = useTransition();
  const [tip, setTip] = useState<KasaHareketTip>(
    defaultTip ?? KasaHareketTip.Giris,
  );
  const [kasaId, setKasaId] = useState<number | null>(defaultKasaId);

  const isOpen = defaultKasaId !== null;
  const kaynakKasa = kasaId ? kasalar.find((k) => k.id === kasaId) : null;

  // Hedef kasa seçenekleri: kaynak ile aynı para biriminde olanlar, kendisi hariç
  const hedefAdaylari = kaynakKasa
    ? kasalar.filter(
        (k) => k.id !== kaynakKasa.id && k.paraBirimi === kaynakKasa.paraBirimi,
      )
    : [];

  useEffect(() => {
    if (isOpen) {
      setKasaId(defaultKasaId);
      setTip(defaultTip ?? KasaHareketTip.Giris);
    }
  }, [isOpen, defaultKasaId, defaultTip]);

  async function submit(formData: FormData) {
    const r = await createKasaHareketi(formData);
    if (r.ok) {
      toast.success("Hareket kaydedildi");
      onSaved();
    } else {
      toast.error(r.error);
    }
  }

  const formKey = `kasa-hareket-${defaultKasaId ?? "x"}-${isOpen}`;
  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <DataModal
      isOpen={isOpen}
      onClose={onClose}
      title="Yeni Kasa Hareketi"
      description={
        kaynakKasa
          ? `${kaynakKasa.ad} · ${kaynakKasa.paraBirimi}`
          : "Bir kasa seçerek hareket girin"
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
            isDisabled={pending || !kasaId}
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
          <Label htmlFor="tip" required>
            Hareket Tipi
          </Label>
          <Select
            id="tip"
            name="tip"
            value={tip}
            onChange={(e) => setTip(e.target.value as KasaHareketTip)}
          >
            <option value={KasaHareketTip.Giris}>
              {kasaHareketTipEtiket.Giris} (+)
            </option>
            <option value={KasaHareketTip.Cikis}>
              {kasaHareketTipEtiket.Cikis} (−)
            </option>
            <option value={KasaHareketTip.Transfer}>
              {kasaHareketTipEtiket.Transfer}
            </option>
          </Select>
        </Field>

        <Field>
          <Label htmlFor="kasaId" required>
            {tip === KasaHareketTip.Transfer ? "Kaynak Kasa" : "Kasa"}
          </Label>
          <Select
            id="kasaId"
            name="kasaId"
            value={kasaId ?? ""}
            onChange={(e) => setKasaId(Number(e.target.value) || null)}
            required
          >
            <option value="" disabled>
              Seçiniz…
            </option>
            {kasalar.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ad} ({k.paraBirimi})
              </option>
            ))}
          </Select>
        </Field>

        {tip === KasaHareketTip.Transfer && (
          <Field>
            <Label htmlFor="hedefKasaId" required hint="aynı para birimi">
              Hedef Kasa
            </Label>
            <Select
              id="hedefKasaId"
              name="hedefKasaId"
              required={tip === KasaHareketTip.Transfer}
              defaultValue=""
            >
              <option value="" disabled>
                Seçiniz…
              </option>
              {hedefAdaylari.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ad} ({k.paraBirimi})
                </option>
              ))}
            </Select>
            {kaynakKasa && hedefAdaylari.length === 0 && (
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--warning)" }}
              >
                {kaynakKasa.paraBirimi} para biriminde başka aktif kasa yok.
              </p>
            )}
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label
              htmlFor="tutar"
              required
              hint={kaynakKasa?.paraBirimi ?? ""}
            >
              Tutar
            </Label>
            <TextInput
              id="tutar"
              name="tutar"
              type="number"
              step="0.01"
              min="0.01"
              required
              autoFocus
              placeholder="0,00"
            />
          </Field>
          <Field>
            <Label htmlFor="tarih" required>
              Tarih
            </Label>
            <TextInput
              id="tarih"
              name="tarih"
              type="date"
              defaultValue={bugun}
              required
            />
          </Field>
        </div>

        <Field>
          <Label htmlFor="belgeNo">Belge No</Label>
          <TextInput
            id="belgeNo"
            name="belgeNo"
            maxLength={100}
            placeholder="Dekont no, makbuz no..."
          />
        </Field>

        <Field>
          <Label htmlFor="aciklama">Açıklama</Label>
          <TextArea
            id="aciklama"
            name="aciklama"
            rows={2}
            maxLength={2000}
          />
        </Field>
      </form>
    </DataModal>
  );
}

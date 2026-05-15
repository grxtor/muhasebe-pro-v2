"use client";

import { useState, useTransition, useMemo } from "react";
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
  FaturaYonu,
  FaturaDurumu,
  faturaDurumuEtiket,
} from "@/lib/enums";
import { createFatura, updateFatura } from "./actions";
import { DekontList } from "./dekont-list";
import { formatTutar } from "@/lib/format";
import type { FaturaRow, CariRef } from "./fatura-list";

interface Props {
  isOpen: boolean;
  fatura: FaturaRow | null;
  cariler: CariRef[];
  sonrakiNo: string;
  onClose: () => void;
  onSaved: () => void;
}

export function FaturaDialog({
  isOpen,
  fatura,
  cariler,
  sonrakiNo,
  onClose,
  onSaved,
}: Props) {
  const isEdit = fatura !== null;
  const [pending, startTransition] = useTransition();

  // Canlı KDV önizlemesi için lokal state
  const [tutar, setTutar] = useState(
    isEdit ? parseFloat(fatura.tutar) : 0,
  );
  const [oran, setOran] = useState(
    isEdit ? parseFloat(fatura.kdvOrani) : 20,
  );

  const onayOzeti = useMemo(() => {
    const kdv = +(tutar * (oran / 100)).toFixed(2);
    const toplam = +(tutar + kdv).toFixed(2);
    return { kdv, toplam };
  }, [tutar, oran]);

  async function handleSubmit(formData: FormData) {
    const result = isEdit
      ? await updateFatura(fatura.id, formData)
      : await createFatura(formData);
    if (result.ok) {
      toast.success(isEdit ? "Fatura güncellendi" : "Fatura oluşturuldu");
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

  const formKey = `${isEdit ? fatura.id : "new"}-${isOpen}`;
  const today = new Date().toISOString().slice(0, 10);
  const defaultVade = new Date(Date.now() + 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  return (
    <DataModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Düzenle: ${fatura.faturaNo}` : "Yeni Fatura"}
      description="KDV ve toplam otomatik hesaplanır"
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
        <Field>
          <Label htmlFor="yon" required>
            Fatura Yönü
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <RadioCard
              name="yon"
              value={FaturaYonu.Gonderilen}
              label="Gönderilen"
              hint="Müşteriye"
              defaultChecked={
                isEdit
                  ? fatura.yon === FaturaYonu.Gonderilen
                  : true
              }
              tone="positive"
            />
            <RadioCard
              name="yon"
              value={FaturaYonu.Gelen}
              label="Gelen"
              hint="Tedarikçiden"
              defaultChecked={isEdit && fatura.yon === FaturaYonu.Gelen}
              tone="negative"
            />
          </div>
        </Field>

        <Field>
          <Label htmlFor="cariId" required>
            Profil (Müşteri / Tedarikçi)
          </Label>
          <Select
            id="cariId"
            name="cariId"
            required
            defaultValue={fatura?.cariId ?? ""}
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
              Önce bir profil eklemelisiniz.
            </p>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="faturaNo" required>
              Fatura No
            </Label>
            <TextInput
              id="faturaNo"
              name="faturaNo"
              required
              defaultValue={fatura?.faturaNo ?? sonrakiNo}
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
              required
              defaultValue={
                isEdit ? fatura.tarih.slice(0, 10) : today
              }
            />
          </Field>
        </div>

        <Field>
          <Label htmlFor="isAciklamasi" required>
            İş Açıklaması
          </Label>
          <TextArea
            id="isAciklamasi"
            name="isAciklamasi"
            rows={2}
            required
            minLength={2}
            defaultValue={fatura?.isAciklamasi ?? ""}
            placeholder="Yapılan iş, satılan mal/hizmet detayları…"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <Label htmlFor="tutar" required hint="₺ (KDV hariç)">
              Tutar
            </Label>
            <TextInput
              id="tutar"
              name="tutar"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={tutar || ""}
              onChange={(e) => setTutar(parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field>
            <Label htmlFor="kdvOrani" hint="%">
              KDV Oranı
            </Label>
            <TextInput
              id="kdvOrani"
              name="kdvOrani"
              type="number"
              step="0.1"
              min="0"
              max="100"
              defaultValue={oran}
              onChange={(e) => setOran(parseFloat(e.target.value) || 0)}
            />
          </Field>
          <div
            className="flex flex-col justify-end rounded-lg border p-3"
            style={{
              background: "var(--brand-soft)",
              borderColor:
                "color-mix(in oklch, var(--brand) 20%, transparent)",
            }}
          >
            <div
              className="text-[10px] font-semibold uppercase"
              style={{ color: "var(--brand)" }}
            >
              Genel Toplam
            </div>
            <div
              className="mt-0.5 text-lg font-bold tabular-nums"
              style={{ color: "var(--brand)" }}
            >
              {formatTutar(onayOzeti.toplam)} ₺
            </div>
            <div
              className="text-[11px] tabular-nums"
              style={{ color: "var(--text-muted)" }}
            >
              KDV: {formatTutar(onayOzeti.kdv)} ₺
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="vadeTarihi">Vade Tarihi</Label>
            <TextInput
              id="vadeTarihi"
              name="vadeTarihi"
              type="date"
              defaultValue={
                isEdit
                  ? fatura.vadeTarihi
                    ? fatura.vadeTarihi.slice(0, 10)
                    : ""
                  : defaultVade
              }
            />
          </Field>
          <Field>
            <Label htmlFor="durum">Durum</Label>
            <Select
              id="durum"
              name="durum"
              defaultValue={fatura?.durum ?? FaturaDurumu.Beklemede}
            >
              <option value={FaturaDurumu.Beklemede}>
                {faturaDurumuEtiket.Beklemede}
              </option>
              <option value={FaturaDurumu.KismiOdendi}>
                {faturaDurumuEtiket.KismiOdendi}
              </option>
              <option value={FaturaDurumu.Odendi}>
                {faturaDurumuEtiket.Odendi}
              </option>
              <option value={FaturaDurumu.Iptal}>
                {faturaDurumuEtiket.Iptal}
              </option>
            </Select>
          </Field>
        </div>

        <Field>
          <Label htmlFor="notlar">Notlar</Label>
          <TextArea
            id="notlar"
            name="notlar"
            rows={2}
            defaultValue={fatura?.notlar ?? ""}
          />
        </Field>

        {!isEdit && (
          <div
            className="rounded-lg border p-3"
            style={{
              background: "var(--surface-muted)",
              borderColor: "var(--border)",
            }}
          >
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="odemeNotuOlustur"
                value="true"
                defaultChecked
                className="size-4 rounded"
                style={{ accentColor: "var(--brand)" }}
              />
              <span>
                Otomatik Alacak/Borç notu oluştur
                <span
                  className="ml-1 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  (Alacaklar veya Borçlar sayfasında görünür)
                </span>
              </span>
            </label>
          </div>
        )}

        <input type="hidden" name="paraBirimi" value="TRY" />
      </form>

      {/* Dekont upload — sadece kaydedilmiş (edit mode) faturalar için */}
      {isEdit && fatura && (
        <div className="mt-4">
          <DekontList faturaId={fatura.id} />
        </div>
      )}
      {!isEdit && (
        <p
          className="mt-3 text-xs"
          style={{ color: "var(--text-soft)" }}
        >
          💡 Dekont (PDF, görsel) eklemek için önce faturayı kaydedin,
          sonra üzerine tıklayıp düzenleme açın.
        </p>
      )}
    </DataModal>
  );
}

function RadioCard({
  name,
  value,
  label,
  hint,
  defaultChecked,
  tone,
}: {
  name: string;
  value: string;
  label: string;
  hint: string;
  defaultChecked?: boolean;
  tone: "positive" | "negative";
}) {
  return (
    <label
      className="relative flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] has-[input:checked]:bg-(--bg-active) has-[input:checked]:border-(--border-active)"
      style={
        {
          background: "var(--surface)",
          borderColor: "var(--border-strong)",
          // CSS var trick: only apply when checked
          "--bg-active":
            tone === "positive" ? "var(--positive-soft)" : "var(--negative-soft)",
          "--border-active":
            tone === "positive"
              ? "color-mix(in oklch, var(--positive) 40%, transparent)"
              : "color-mix(in oklch, var(--negative) 40%, transparent)",
        } as React.CSSProperties
      }
    >
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="size-4"
        style={{ accentColor: "var(--brand)" }}
      />
      <span className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {hint}
        </span>
      </span>
    </label>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { DataModal } from "@/components/ui/data-modal";
import { DekontList } from "@/components/ui/dekont-list";
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
  CariTipi,
  HarcamaTuru,
  harcamaTuruEtiket,
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
  const [selectedCariId, setSelectedCariId] = useState<number | "">(
    notu?.cariId ?? "",
  );

  const selectedCari = useMemo(
    () =>
      typeof selectedCariId === "number"
        ? cariler.find((c) => c.id === selectedCariId) ?? null
        : null,
    [cariler, selectedCariId],
  );

  const harcamaTuru =
    selectedCari?.tip === CariTipi.Harcama
      ? (selectedCari.harcamaTuru as HarcamaTuru | null)
      : null;

  const detay = notu?.detay ?? null;
  function detayStr(key: string): string {
    if (!detay) return "";
    const v = detay[key];
    if (v === null || v === undefined) return "";
    return typeof v === "string" ? v : String(v);
  }
  function detayBool(key: string): boolean {
    if (!detay) return false;
    const v = detay[key];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v === "true" || v === "on";
    return false;
  }

  const hedefCariOptions = useMemo(
    () => cariler.filter((c) => c.tip !== CariTipi.Harcama),
    [cariler],
  );

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
            Profil (Müşteri / Tedarikçi / Harcama kategorisi)
          </Label>
          <Select
            id="cariId"
            name="cariId"
            required
            value={selectedCariId === "" ? "" : String(selectedCariId)}
            onChange={(e) =>
              setSelectedCariId(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
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

        {harcamaTuru === HarcamaTuru.Promosyon && (
          <div
            className="space-y-3 rounded-lg border p-3"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface-muted)",
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              Promosyon Detayı — {harcamaTuruEtiket.Promosyon}
            </div>
            <Field>
              <Label htmlFor="detay.hedefCariId">Hedef Profil</Label>
              <Select
                id="detay.hedefCariId"
                name="detay.hedefCariId"
                defaultValue={detayStr("hedefCariId")}
              >
                <option value="">— seçin —</option>
                {hedefCariOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.kod} — {c.unvan}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <Label htmlFor="detay.videoBasligi">Video Başlığı</Label>
                <TextInput
                  id="detay.videoBasligi"
                  name="detay.videoBasligi"
                  defaultValue={detayStr("videoBasligi")}
                  placeholder="Şarkı / video adı"
                />
              </Field>
              <Field>
                <Label htmlFor="detay.platform">Platform</Label>
                <Select
                  id="detay.platform"
                  name="detay.platform"
                  defaultValue={detayStr("platform")}
                >
                  <option value="">— seçin —</option>
                  <option value="Spotify">Spotify</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Apple Music">Apple Music</option>
                  <option value="Diğer">Diğer</option>
                </Select>
              </Field>
            </div>
            <Field>
              <Label htmlFor="detay.videoUrl">Video URL</Label>
              <TextInput
                id="detay.videoUrl"
                name="detay.videoUrl"
                type="url"
                defaultValue={detayStr("videoUrl")}
                placeholder="https://…"
              />
            </Field>
          </div>
        )}

        {harcamaTuru === HarcamaTuru.Ticaret && (
          <div
            className="space-y-3 rounded-lg border p-3"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface-muted)",
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              Ticaret Detayı
            </div>
            <Field>
              <Label htmlFor="detay.getiri" hint="₺">
                Getiri Tutarı
              </Label>
              <TextInput
                id="detay.getiri"
                name="detay.getiri"
                type="number"
                step="0.01"
                min="0"
                defaultValue={detayStr("getiri")}
                placeholder="İleride güncellenebilir"
              />
            </Field>
          </div>
        )}

        {harcamaTuru === HarcamaTuru.Avans && (
          <div
            className="space-y-3 rounded-lg border p-3"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface-muted)",
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              Avans Detayı
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <Label htmlFor="detay.geriOdemeTarihi">
                  Geri Ödeme Vadesi
                </Label>
                <TextInput
                  id="detay.geriOdemeTarihi"
                  name="detay.geriOdemeTarihi"
                  type="date"
                  defaultValue={detayStr("geriOdemeTarihi")}
                />
              </Field>
              <Field>
                <Label htmlFor="detay.geriOdenenTutar" hint="₺">
                  Geri Ödenen Tutar
                </Label>
                <TextInput
                  id="detay.geriOdenenTutar"
                  name="detay.geriOdenenTutar"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={detayStr("geriOdenenTutar")}
                />
              </Field>
            </div>
            <Field>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="detay.geriOdendi"
                  value="true"
                  defaultChecked={detayBool("geriOdendi")}
                  className="size-4 rounded"
                  style={{ accentColor: "var(--accent)" }}
                />
                <span>Geri Ödendi</span>
              </label>
            </Field>
          </div>
        )}

        <input type="hidden" name="paraBirimi" value="TRY" />
      </form>

      {/* Dekont upload */}
      <div className="mt-4">
        <DekontList
          hedef={{ tip: "odemeNotu", id: isEdit && notu ? notu.id : 0 }}
          pendingMessage={`Dekont eklemek için önce ${isAlacak ? "alacak" : "borç"} kaydını oluşturun, sonra düzenleme ile dosya yükleyin.`}
        />
      </div>
    </DataModal>
  );
}

function isoDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

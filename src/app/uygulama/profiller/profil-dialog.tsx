"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@heroui/react";
import { Tag as TagIcon, Check } from "lucide-react";
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
  CariTipi,
  cariTipiEtiket,
  HarcamaTuru,
  harcamaTuruEtiket,
  harcamaTuruAciklama,
  tagColorClass,
  type TagColor,
} from "@/lib/enums";
import { createProfil, updateProfil } from "./actions";
import { setCariTags } from "../ayarlar/etiketler/actions";
import type { ProfilRow, TagRef } from "./profil-list";

interface Props {
  isOpen: boolean;
  profil: ProfilRow | null;
  sonrakiKod: string;
  tumEtiketler: TagRef[];
  onClose: () => void;
  onSaved: () => void;
}

export function ProfilDialog({
  isOpen,
  profil,
  sonrakiKod,
  tumEtiketler,
  onClose,
  onSaved,
}: Props) {
  const isEdit = profil !== null;
  const [pending, startTransition] = useTransition();
  const [secilenEtiketler, setSecilenEtiketler] = useState<number[]>(
    profil?.etiketler.map((t) => t.id) ?? [],
  );
  const [tip, setTip] = useState<string>(profil?.tip ?? CariTipi.Musteri);
  const [harcamaTuru, setHarcamaTuru] = useState<HarcamaTuru>(
    (profil?.harcamaTuru as HarcamaTuru | null) ?? HarcamaTuru.Genel,
  );
  const isHarcama = tip === CariTipi.Harcama;

  // Modal her açıldığında etiket seçimini sıfırla
  useEffect(() => {
    if (isOpen) {
      setSecilenEtiketler(profil?.etiketler.map((t) => t.id) ?? []);
      setTip(profil?.tip ?? CariTipi.Musteri);
      setHarcamaTuru(
        (profil?.harcamaTuru as HarcamaTuru | null) ?? HarcamaTuru.Genel,
      );
    }
  }, [isOpen, profil]);

  async function handleSubmit(formData: FormData) {
    const result = isEdit
      ? await updateProfil(profil.id, formData)
      : await createProfil(formData);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    // Profil kaydedildikten sonra etiketleri uygula
    // Yeni profil ise: kod ile bul (UI'da id yok)
    if (isEdit) {
      await setCariTags(profil.id, secilenEtiketler);
    } else if (secilenEtiketler.length > 0) {
      // Yeni profilin id'sini al
      const kod = formData.get("kod") as string;
      const yeniProfil = await fetch(
        `/api/internal/cari-by-kod?kod=${encodeURIComponent(kod)}`,
      )
        .then((r) => r.json())
        .catch(() => null);
      if (yeniProfil?.id) {
        await setCariTags(yeniProfil.id, secilenEtiketler);
      }
    }
    toast.success(isEdit ? "Profil güncellendi" : "Profil oluşturuldu");
    onSaved();
  }

  function onAction(formData: FormData) {
    startTransition(() => {
      void handleSubmit(formData);
    });
  }

  function toggleEtiket(id: number) {
    setSecilenEtiketler((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
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
          : "Müşteri, tedarikçi veya harcama kategorisi ekleyin"
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
              {isHarcama ? "Kategori Adı" : "Ünvan / Ad Soyad"}
            </Label>
            <TextInput
              id="unvan"
              name="unvan"
              required
              minLength={2}
              defaultValue={profil?.unvan ?? ""}
              placeholder={
                isHarcama
                  ? "Yemek, Yakıt, Kira, Personel maaşları..."
                  : "Örnek Limited"
              }
            />
          </Field>
        </div>

        <Field>
          <Label htmlFor="tip">Tip</Label>
          <Select
            id="tip"
            name="tip"
            value={tip}
            onChange={(e) => setTip(e.target.value)}
          >
            <option value={CariTipi.Musteri}>{cariTipiEtiket.Musteri}</option>
            <option value={CariTipi.Tedarikci}>
              {cariTipiEtiket.Tedarikci}
            </option>
            <option value={CariTipi.HerIkisi}>
              {cariTipiEtiket.HerIkisi}
            </option>
            <option value={CariTipi.Harcama}>{cariTipiEtiket.Harcama}</option>
          </Select>
          {isHarcama && (
            <p
              className="mt-1.5 text-xs"
              style={{ color: "var(--text-soft)" }}
            >
              💡 Harcama profili — bir kategori. Altına Borç ekleyerek tarih,
              tutar ve notla harcama kaydedebilirsin.
            </p>
          )}
        </Field>

        {isHarcama && (
          <Field>
            <Label htmlFor="harcamaTuru">Harcama Türü</Label>
            <Select
              id="harcamaTuru"
              name="harcamaTuru"
              value={harcamaTuru}
              onChange={(e) =>
                setHarcamaTuru(e.target.value as HarcamaTuru)
              }
            >
              <option value={HarcamaTuru.Genel}>
                {harcamaTuruEtiket.Genel}
              </option>
              <option value={HarcamaTuru.Promosyon}>
                {harcamaTuruEtiket.Promosyon}
              </option>
              <option value={HarcamaTuru.Avans}>
                {harcamaTuruEtiket.Avans}
              </option>
              <option value={HarcamaTuru.Ticaret}>
                {harcamaTuruEtiket.Ticaret}
              </option>
            </Select>
            <p
              className="mt-1.5 text-xs"
              style={{ color: "var(--text-soft)" }}
            >
              {harcamaTuruAciklama[harcamaTuru]}
            </p>
          </Field>
        )}

        {!isHarcama && (
          <>
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
          </>
        )}

        <Field>
          <Label htmlFor="notlar">
            {isHarcama ? "Açıklama" : "Notlar"}
          </Label>
          <TextArea
            id="notlar"
            name="notlar"
            rows={isHarcama ? 3 : 2}
            defaultValue={profil?.notlar ?? ""}
            placeholder={
              isHarcama
                ? "Bu kategorinin amacı, kapsamı (örn. ofis için yapılan tüm yemek harcamaları)..."
                : ""
            }
          />
        </Field>

        {/* Etiketler */}
        {tumEtiketler.length > 0 ? (
          <Field>
            <Label htmlFor="">Etiketler</Label>
            <div className="flex flex-wrap gap-1.5">
              {tumEtiketler.map((t) => {
                const isSelected = secilenEtiketler.includes(t.id);
                const c = tagColorClass[t.renk as TagColor] ?? tagColorClass.gray;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleEtiket(t.id)}
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all"
                    style={{
                      background: isSelected ? c.bg : "var(--surface)",
                      color: isSelected ? c.text : "var(--text-muted)",
                      borderColor: isSelected ? c.border : "var(--border-strong)",
                    }}
                  >
                    {isSelected ? (
                      <Check size={11} />
                    ) : (
                      <TagIcon size={11} />
                    )}
                    {t.ad}
                  </button>
                );
              })}
            </div>
          </Field>
        ) : (
          <Field>
            <Label htmlFor="">Etiketler</Label>
            <p
              className="text-xs"
              style={{ color: "var(--text-soft)" }}
            >
              Henüz etiket yok. Ayarlar &gt; Etiketler menüsünden oluşturabilirsin.
            </p>
          </Field>
        )}

        <Field>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="aktif"
              value="true"
              defaultChecked={profil?.aktif ?? true}
              className="size-4 rounded"
              style={{ accentColor: "var(--accent)" }}
            />
            <span>Aktif</span>
          </label>
        </Field>
      </form>

      {/* Dekont/Belge upload */}
      <div className="mt-4">
        <DekontList
          hedef={{ tip: "cari", id: isEdit && profil ? profil.id : 0 }}
          pendingMessage="Belge (sözleşme, kimlik kopyası, vs.) eklemek için önce profili kaydedin."
        />
      </div>
    </DataModal>
  );
}

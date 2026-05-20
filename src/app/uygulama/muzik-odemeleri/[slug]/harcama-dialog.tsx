"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
import { DataModal } from "@/components/ui/data-modal";
import {
  Field,
  Label,
  TextInput,
  TextArea,
  Select,
  FormGrid,
  MoneyField,
} from "@/components/ui/form-field";
import { Combobox } from "@/components/ui/combobox";
import { SwitchRow } from "@/components/ui/switch";
import {
  MuzikHarcamaKategori,
  muzikHarcamaKategoriEtiket,
  CariTipi,
  HarcamaTuru,
} from "@/lib/enums";
import { createMuzikHarcama } from "../actions";
import { createCariInline } from "@/app/uygulama/profiller/actions";
import type { PromoterOption, KasaOption } from "./muzik-detail";

interface Props {
  open: boolean;
  onClose: () => void;
  muzikProfilId: number;
  muzikIsim: string;
  promoterlar: PromoterOption[];
  kasalar: KasaOption[];
}

export function HarcamaDialog({
  open,
  onClose,
  muzikProfilId,
  muzikIsim,
  promoterlar,
  kasalar,
}: Props) {
  if (!open) return null;
  return (
    <HarcamaDialogInner
      onClose={onClose}
      muzikProfilId={muzikProfilId}
      muzikIsim={muzikIsim}
      promoterlar={promoterlar}
      kasalar={kasalar}
    />
  );
}

function HarcamaDialogInner({
  onClose,
  muzikProfilId,
  muzikIsim,
  promoterlar,
  kasalar,
}: {
  onClose: () => void;
  muzikProfilId: number;
  muzikIsim: string;
  promoterlar: PromoterOption[];
  kasalar: KasaOption[];
}) {
  const router = useRouter();
  const bugun = new Date().toISOString().slice(0, 10);
  const varsayilanKasa = kasalar.find((k) => k.varsayilan) ?? kasalar[0];

  const [tarih, setTarih] = useState(bugun);
  const [kategori, setKategori] = useState<string>("");
  const [tutar, setTutar] = useState("");
  const [promoterSecimi, setPromoterSecimi] = useState<{
    id: string | null;
    label: string;
  }>({ id: null, label: "" });
  const [kasaId, setKasaId] = useState<string>(
    varsayilanKasa ? String(varsayilanKasa.id) : "",
  );
  const [not, setNot] = useState("");
  const [borclaraYansit, setBorclaraYansit] = useState(true);
  const [saving, setSaving] = useState(false);

  const seciliKasa = kasalar.find((k) => String(k.id) === kasaId);

  async function handleSave() {
    if (!tutar || Number(tutar) <= 0) {
      toast.error("Tutar girilmeli");
      return;
    }
    setSaving(true);

    /* Yeni promoter mı? Önce Cari oluştur */
    let resolvedPromoterId = promoterSecimi.id;
    if (!resolvedPromoterId && promoterSecimi.label) {
      const created = await createCariInline({
        unvan: promoterSecimi.label,
        tip: CariTipi.Harcama,
        harcamaTuru: HarcamaTuru.Promoter,
      });
      if (!created.ok) {
        setSaving(false);
        toast.error(`Yeni promoter oluşturulamadı: ${created.error}`);
        return;
      }
      resolvedPromoterId = String(created.data!.id);
      toast.success(`Yeni promoter oluşturuldu: ${created.data!.unvan}`);
    }

    const fd = new FormData();
    fd.set("muzikProfilId", String(muzikProfilId));
    fd.set("tarih", tarih);
    fd.set("tutar", tutar);
    fd.set("paraBirimi", "USD");
    if (kategori) fd.set("kategori", kategori);
    if (resolvedPromoterId) fd.set("promoterCariId", resolvedPromoterId);
    if (kasaId) fd.set("kasaId", kasaId);
    fd.set("borclaraYansit", borclaraYansit ? "true" : "false");
    if (not) fd.set("not", not);

    const r = await createMuzikHarcama(fd);
    setSaving(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success(
      borclaraYansit
        ? `Harcama eklendi${seciliKasa ? ` · ${seciliKasa.ad}'dan çıktı` : ""} + Borçlar'a düştü`
        : "Harcama eklendi (sadece müzik defterinde)",
    );
    router.refresh();
    onClose();
  }

  const promoterOptions = promoterlar.map((p) => ({
    value: String(p.id),
    label: p.ad,
    hint: p.fiyat ? `$${p.fiyat}` : undefined,
  }));

  return (
    <DataModal
      isOpen={true}
      onClose={onClose}
      size="xl"
      title="Yeni Harcama"
      description={muzikIsim}
      footer={
        <>
          <Button variant="ghost" size="md" onPress={onClose} isDisabled={saving}>
            Vazgeç
          </Button>
          <Button variant="primary" size="md" onPress={handleSave} isDisabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <MoneyField
          name="tutar"
          fixedCurrency="USD"
          value={tutar}
          onValueChange={setTutar}
        />

        <FormGrid cols={2}>
          <Field>
            <Label htmlFor="hTarih" required>
              Tarih
            </Label>
            <TextInput
              id="hTarih"
              name="tarih"
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
            />
          </Field>

          <Field>
            <Label htmlFor="hKategori" hint="opsiyonel">
              Kategori
            </Label>
            <Select
              id="hKategori"
              name="kategori"
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
            >
              <option value="">— Belirsiz —</option>
              {Object.values(MuzikHarcamaKategori).map((k) => (
                <option key={k} value={k}>
                  {muzikHarcamaKategoriEtiket[k]}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>

        <FormGrid cols={2}>
          <Field>
            <Label htmlFor="hPromoter" hint="reklam ise">
              Promoter
            </Label>
            <Combobox
              id="hPromoter"
              options={promoterOptions}
              value={promoterSecimi.id}
              newLabel={
                !promoterSecimi.id && promoterSecimi.label
                  ? promoterSecimi.label
                  : undefined
              }
              placeholder="Promoter ara veya yeni ekle…"
              createLabel={(t) => `Yeni promoter: "${t}"`}
              emptyHint="Promoter yok — yeni eklemek için yaz"
              onChange={(sel) =>
                setPromoterSecimi({
                  id: sel.isNew ? null : sel.value,
                  label: sel.label,
                })
              }
            />
          </Field>

          <Field>
            <Label
              htmlFor="hKasa"
              hint={seciliKasa ? seciliKasa.paraBirimi : "opsiyonel"}
            >
              Kasa
            </Label>
            <Select
              id="hKasa"
              name="kasaId"
              value={kasaId}
              onChange={(e) => setKasaId(e.target.value)}
            >
              <option value="">— Yok —</option>
              {kasalar.map((k) => (
                <option key={k.id} value={String(k.id)}>
                  {k.ad}
                  {k.varsayilan ? " · varsayılan" : ""}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>

        <Field>
          <Label htmlFor="hNot" hint="opsiyonel">
            Not / Breakdown
          </Label>
          <TextArea
            id="hNot"
            name="not"
            rows={2}
            placeholder="Örn. 1000$ harcandı, 100$'ı tasarıma, 900$'ı promosyona"
            value={not}
            onChange={(e) => setNot(e.target.value)}
          />
        </Field>

        <SwitchRow
          checked={borclaraYansit}
          onChange={setBorclaraYansit}
          label={
            <span className="inline-flex items-center gap-1.5">
              <Link2 size={13} />
              Borçlar&apos;a da kaydet
            </span>
          }
          description="Borçlar / Hareketler / Kasa tablolarına otomatik düşer. Promoter yoksa Sistem carisine bağlanır."
          tone="warning"
        />
      </div>
    </DataModal>
  );
}

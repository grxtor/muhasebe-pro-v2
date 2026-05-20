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
  TextArea,
  TextInput,
  Select,
  FormGrid,
  MoneyField,
} from "@/components/ui/form-field";
import { Combobox } from "@/components/ui/combobox";
import { SwitchRow } from "@/components/ui/switch";
import { CariTipi, HarcamaTuru } from "@/lib/enums";
import { createSanatciOdemesi, updateSanatciOdemesi } from "../actions";
import { createCariInline } from "@/app/uygulama/profiller/actions";
import type { KasaOption, SanatciOdemesiRow } from "./muzik-detail";

interface Props {
  open: boolean;
  onClose: () => void;
  muzikProfilId: number;
  muzikIsim: string;
  sanatcilar: { id: number; ad: string }[];
  kasalar: KasaOption[];
  editing?: SanatciOdemesiRow | null;
}

export function SanatciOdemesiDialog(props: Props) {
  if (!props.open) return null;
  return <SanatciOdemesiDialogInner {...props} onClose={props.onClose} />;
}

function SanatciOdemesiDialogInner({
  onClose,
  muzikProfilId,
  muzikIsim,
  sanatcilar,
  kasalar,
  editing,
}: Omit<Props, "open">) {
  const router = useRouter();
  const isEdit = Boolean(editing);
  const bugun = new Date().toISOString().slice(0, 10);
  const varsayilanKasa = kasalar.find((k) => k.varsayilan) ?? kasalar[0];

  const [tarih, setTarih] = useState(editing?.tarih ?? bugun);
  const [sanatciSecimi, setSanatciSecimi] = useState<{
    id: string | null;
    label: string;
  }>(() => {
    if (editing) {
      return {
        id: String(editing.sanatci.id),
        label:
          sanatcilar.find((s) => s.id === editing.sanatci.id)?.ad ?? "",
      };
    }
    const first = sanatcilar[0];
    return first ? { id: String(first.id), label: first.ad } : { id: null, label: "" };
  });
  const [tutar, setTutar] = useState(editing ? String(editing.tutar) : "");
  const [paraBirimi, setParaBirimi] = useState(editing?.paraBirimi ?? "USD");
  const [kasaId, setKasaId] = useState<string>(
    varsayilanKasa ? String(varsayilanKasa.id) : "",
  );
  const [not, setNot] = useState(editing?.not ?? "");
  const [borclaraYansit, setBorclaraYansit] = useState(
    editing?.borclaraYansit ?? true,
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!sanatciSecimi.id && !sanatciSecimi.label) {
      toast.error("Sanatçı seçilmeli veya yeni sanatçı ismi girilmeli");
      return;
    }
    if (!tutar || Number(tutar) <= 0) {
      toast.error("Tutar girilmeli");
      return;
    }

    setSaving(true);

    /* Yeni sanatçı? Önce Cari oluştur, sonra ID'siyle ödeme create */
    let resolvedCariId = sanatciSecimi.id;
    if (!resolvedCariId && sanatciSecimi.label) {
      const created = await createCariInline({
        unvan: sanatciSecimi.label,
        tip: CariTipi.Harcama,
        harcamaTuru: HarcamaTuru.Sanatci,
      });
      if (!created.ok) {
        setSaving(false);
        toast.error(`Yeni sanatçı oluşturulamadı: ${created.error}`);
        return;
      }
      resolvedCariId = String(created.data!.id);
      toast.success(`Yeni sanatçı oluşturuldu: ${created.data!.unvan}`);
    }

    const fd = new FormData();
    fd.set("muzikProfilId", String(muzikProfilId));
    fd.set("sanatciCariId", resolvedCariId!);
    fd.set("tarih", tarih);
    fd.set("tutar", tutar);
    fd.set("paraBirimi", paraBirimi);
    if (kasaId) fd.set("kasaId", kasaId);
    fd.set("borclaraYansit", borclaraYansit ? "true" : "false");
    if (not) fd.set("not", not);

    const r = editing
      ? await updateSanatciOdemesi(editing.id, fd)
      : await createSanatciOdemesi(fd);
    setSaving(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success(
      isEdit ? "Sanatçı ödemesi güncellendi" : "Sanatçı ödemesi eklendi",
    );
    router.refresh();
    onClose();
  }

  const sanatciOptions = sanatcilar.map((s) => ({
    value: String(s.id),
    label: s.ad,
  }));

  return (
    <DataModal
      isOpen={true}
      onClose={onClose}
      size="xl"
      title={isEdit ? "Sanatçı Ödemesini Düzenle" : "Sanatçı Ödemesi"}
      description={muzikIsim}
      footer={
        <>
          <Button variant="ghost" size="md" onPress={onClose} isDisabled={saving}>
            Vazgeç
          </Button>
          <Button variant="primary" size="md" onPress={handleSave} isDisabled={saving}>
            {saving ? "Kaydediliyor…" : isEdit ? "Güncelle" : "Kaydet"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <MoneyField
          name="tutar"
          currencyName="paraBirimi"
          currencies={["USD", "TRY", "EUR", "GBP"]}
          value={tutar}
          currencyValue={paraBirimi}
          onValueChange={setTutar}
          onCurrencyChange={setParaBirimi}
        />

        <FormGrid cols={2}>
          <Field>
            <Label htmlFor="oTarih" required>
              Tarih
            </Label>
            <TextInput
              id="oTarih"
              name="tarih"
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
            />
          </Field>

          <Field>
            <Label htmlFor="oSanatci" required>
              Sanatçı
            </Label>
            <Combobox
              id="oSanatci"
              options={sanatciOptions}
              value={sanatciSecimi.id}
              newLabel={
                !sanatciSecimi.id && sanatciSecimi.label
                  ? sanatciSecimi.label
                  : undefined
              }
              placeholder="Sanatçı ara veya yeni ekle…"
              createLabel={(t) => `Yeni sanatçı: "${t}"`}
              emptyHint="Bağlı sanatçı yok — yazıp 'Yeni sanatçı' satırına bas"
              onChange={(sel) =>
                setSanatciSecimi({
                  id: sel.isNew ? null : sel.value,
                  label: sel.label,
                })
              }
            />
          </Field>
        </FormGrid>

        <Field>
          <Label htmlFor="oKasa" hint="opsiyonel">
            Kasa
          </Label>
          <Select
            id="oKasa"
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

        <Field>
          <Label htmlFor="oNot" hint="opsiyonel">
            Not
          </Label>
          <TextArea
            id="oNot"
            name="not"
            rows={2}
            placeholder="Şubat payout, bonus, vs."
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
          description="Bu ödeme sanatçının Cari kaydı üzerinde Borçlar/Hareketler tablosuna düşer."
          tone="warning"
        />
      </div>
    </DataModal>
  );
}

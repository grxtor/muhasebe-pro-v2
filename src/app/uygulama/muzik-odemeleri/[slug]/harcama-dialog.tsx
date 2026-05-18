"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
import { DataModal } from "@/components/ui/data-modal";
import { Field, Label, TextInput, TextArea, Select } from "@/components/ui/form-field";
import {
  MuzikHarcamaKategori,
  muzikHarcamaKategoriEtiket,
} from "@/lib/enums";
import { createMuzikHarcama } from "../actions";
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
  const [promoterCariId, setPromoterCariId] = useState<string>("");
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
    const fd = new FormData();
    fd.set("muzikProfilId", String(muzikProfilId));
    fd.set("tarih", tarih);
    fd.set("tutar", tutar);
    fd.set("paraBirimi", "USD");
    if (kategori) fd.set("kategori", kategori);
    if (promoterCariId) fd.set("promoterCariId", promoterCariId);
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

  return (
    <DataModal
      isOpen={true}
      onClose={onClose}
      size="xl"
      title="Yeni Harcama"
      description={muzikIsim}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="md" onPress={onClose} isDisabled={saving}>
            Vazgeç
          </Button>
          <Button variant="primary" size="md" onPress={handleSave} isDisabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 grid-cols-2">
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
            <Label htmlFor="hTutar" hint="USD" required>
              Tutar
            </Label>
            <TextInput
              id="hTutar"
              name="tutar"
              type="number"
              placeholder="500"
              value={tutar}
              onChange={(e) => setTutar(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-3 grid-cols-3">
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

          <Field>
            <Label htmlFor="hPromoter" hint="reklam ise">
              Promoter
            </Label>
            <Select
              id="hPromoter"
              name="promoterId"
              value={promoterCariId}
              onChange={(e) => setPromoterCariId(e.target.value)}
            >
              <option value="">— Yok —</option>
              {promoterlar.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.ad}
                  {p.fiyat ? ` ($${p.fiyat})` : ""}
                </option>
              ))}
            </Select>
          </Field>

          <Field>
            <Label
              htmlFor="hKasa"
              hint={
                seciliKasa
                  ? `${seciliKasa.paraBirimi}`
                  : "kasa yok"
              }
            >
              Kasa
            </Label>
            <Select
              id="hKasa"
              name="kasaId"
              value={kasaId}
              onChange={(e) => setKasaId(e.target.value)}
            >
              <option value="">— Yok (sadece müzik defteri) —</option>
              {kasalar.map((k) => (
                <option key={k.id} value={String(k.id)}>
                  {k.ad}
                  {k.varsayilan ? " · varsayılan" : ""}
                </option>
              ))}
            </Select>
          </Field>
        </div>

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

        {/* Borçlar yansıtma toggle */}
        <button
          type="button"
          onClick={() => setBorclaraYansit(!borclaraYansit)}
          className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors"
          style={{
            background: borclaraYansit
              ? "var(--warning-soft)"
              : "var(--surface-muted)",
            borderColor: borclaraYansit
              ? "color-mix(in oklch, var(--warning) 30%, transparent)"
              : "var(--border)",
          }}
        >
          <span
            aria-hidden
            className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-sm border-2"
            style={{
              background: borclaraYansit ? "var(--warning)" : "transparent",
              borderColor: borclaraYansit
                ? "var(--warning)"
                : "var(--border-strong)",
              color: "#fff",
            }}
          >
            {borclaraYansit && "✓"}
          </span>
          <div className="flex-1">
            <div
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{
                color: borclaraYansit ? "var(--warning)" : "var(--text)",
              }}
            >
              <Link2 size={13} />
              Borçlar&apos;a da kaydet
            </div>
            <div
              className="mt-0.5 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Bu harcama Borçlar / Hareketler / Kasa Hareketleri tablolarına
              otomatik düşer. Promoter seçildiyse o promoter&apos;a borç olarak
              bağlanır; yoksa &ldquo;Müzik Harcamaları (Sistem)&rdquo; carisine.
            </div>
          </div>
        </button>
      </div>
    </DataModal>
  );
}

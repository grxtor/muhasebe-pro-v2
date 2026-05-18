"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { Plus, X, TrendingUp, TrendingDown } from "lucide-react";
import { DataModal } from "@/components/ui/data-modal";
import { Field, Label, TextInput, TextArea, Select } from "@/components/ui/form-field";
import {
  MuzikMagaza,
  muzikMagazaEtiket,
  MuzikHarcamaKategori,
  muzikHarcamaKategoriEtiket,
} from "@/lib/enums";
import {
  createMuzikProfil,
  listSanatcilarForSelect,
  listAktiveKasalarForSelect,
} from "./actions";

interface Sanatci {
  id: number;
  ad: string;
}

interface SanatciSatir {
  cariId: number;
  ad: string;
  tutar: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MuzikDialog({ open, onClose }: Props) {
  if (!open) return null;
  return <MuzikDialogInner onClose={onClose} />;
}

function MuzikDialogInner({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const bugun = new Date().toISOString().slice(0, 10);

  // Üst form
  const [isim, setIsim] = useState("");
  const [sanatcilar, setSanatcilar] = useState<SanatciSatir[]>([]);
  const [secilenSanatciId, setSecilenSanatciId] = useState("");
  const [isbirlikciler, setIsbirlikciler] = useState<string[]>([]);
  const [yeniIsbirlikci, setYeniIsbirlikci] = useState("");
  const [magazalar, setMagazalar] = useState<string[]>([]);
  // Para özeti
  const [toplamGelir, setToplamGelir] = useState("");
  const [toplamHarcama, setToplamHarcama] = useState("");
  const [harcamaKategori, setHarcamaKategori] = useState("");
  // Diğer
  const [notlar, setNotlar] = useState("");
  const [kasaId, setKasaId] = useState("");
  const [saving, setSaving] = useState(false);

  // Selector kaynakları
  const [mevcutSanatcilar, setMevcutSanatcilar] = useState<Sanatci[]>([]);
  const [mevcutKasalar, setMevcutKasalar] = useState<
    { id: number; ad: string; paraBirimi: string; varsayilan: boolean }[]
  >([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listSanatcilarForSelect(), listAktiveKasalarForSelect()])
      .then(([s, k]) => {
        if (cancelled) return;
        setMevcutSanatcilar(s.map((x) => ({ id: x.id, ad: x.unvan })));
        setMevcutKasalar(k);
        const def = k.find((x) => x.varsayilan) ?? k[0];
        if (def) setKasaId(String(def.id));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  function addSanatci(rawId: string) {
    const id = Number(rawId);
    if (!id) return;
    const s = mevcutSanatcilar.find((x) => x.id === id);
    if (!s) return;
    if (sanatcilar.some((x) => x.cariId === id)) return;
    setSanatcilar((p) => [
      ...p,
      { cariId: id, ad: s.ad, tutar: "" },
    ]);
    setSecilenSanatciId("");
  }

  function removeSanatci(cariId: number) {
    setSanatcilar((p) => p.filter((s) => s.cariId !== cariId));
  }

  function updateSanatci(
    cariId: number,
    field: "tutar",
    value: string,
  ) {
    setSanatcilar((p) =>
      p.map((s) => (s.cariId === cariId ? { ...s, [field]: value } : s)),
    );
  }

  function addIsbirlikci() {
    const v = yeniIsbirlikci.trim();
    if (!v) return;
    setIsbirlikciler((p) => [...p, v]);
    setYeniIsbirlikci("");
  }

  function removeIsbirlikci(idx: number) {
    setIsbirlikciler((p) => p.filter((_, i) => i !== idx));
  }

  function toggleMagaza(m: string) {
    setMagazalar((p) =>
      p.includes(m) ? p.filter((x) => x !== m) : [...p, m],
    );
  }

  function toggleAllMagaza() {
    const all = Object.values(MuzikMagaza).filter((m) => m !== "Diger");
    setMagazalar((p) => (p.length === all.length ? [] : (all as string[])));
  }

  // Hesaplamalar
  const sanatciToplam = sanatcilar.reduce(
    (s, x) => s + (Number(x.tutar) || 0),
    0,
  );
  const gelirNum = Number(toplamGelir) || 0;
  const harcamaNum = Number(toplamHarcama) || 0;
  const netKar = gelirNum - harcamaNum - sanatciToplam;

  async function handleSave() {
    if (!isim.trim()) {
      toast.error("Müzik adı zorunlu");
      return;
    }
    if (sanatcilar.length === 0) {
      toast.error("En az bir sanatçı eklemelisin");
      return;
    }
    setSaving(true);

    const fd = new FormData();
    fd.set("isim", isim.trim());
    fd.set("sanatciCariIds", sanatcilar.map((s) => s.cariId).join(","));
    fd.set("isbirlikciler", isbirlikciler.join("\n"));
    fd.set("magazalar", magazalar.join(","));
    if (notlar) fd.set("notlar", notlar);
    if (kasaId) fd.set("varsayilanKasaId", kasaId);

    // Sanatçı ödemeleri — tutarı > 0 olanlar
    const sanatciOdemeleri = sanatcilar
      .filter((s) => Number(s.tutar) > 0)
      .map((s) => ({
        cariId: s.cariId,
        tarih: bugun,
        tutar: Number(s.tutar),
        yuzde: null,
        not: null,
      }));
    if (sanatciOdemeleri.length > 0) {
      fd.set("ilkSanatciOdemeleri", JSON.stringify(sanatciOdemeleri));
    }

    // Tek-tutar gelir/harcama (varsa)
    if (gelirNum > 0) {
      fd.set(
        "ilkGelirler",
        JSON.stringify([
          { tarih: bugun, platform: null, tutar: gelirNum, not: null },
        ]),
      );
    }
    if (harcamaNum > 0) {
      fd.set(
        "ilkHarcamalar",
        JSON.stringify([
          {
            tarih: bugun,
            kategori: harcamaKategori || null,
            tutar: harcamaNum,
            not: null,
          },
        ]),
      );
    }

    const r = await createMuzikProfil(fd);
    setSaving(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Müzik eklendi");
    router.refresh();
    onClose();
  }

  return (
    <DataModal
      isOpen={true}
      onClose={onClose}
      size="xl"
      title="Yeni Müzik"
      description="İsim, sanatçılar + payları, gelen para, harcama. Net kâr aşağıda canlı hesaplanır."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="md" onPress={onClose} isDisabled={saving}>
            Vazgeç
          </Button>
          <Button
            variant="primary"
            size="md"
            onPress={handleSave}
            isDisabled={saving || !loaded}
          >
            {saving ? "Kaydediliyor…" : "Oluştur"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 1. Müzik adı */}
        <Field>
          <Label htmlFor="muzikIsim" required>
            Müzik Adı
          </Label>
          <TextInput
            id="muzikIsim"
            placeholder="Örn. Montagem Orbita Especial"
            value={isim}
            onChange={(e) => setIsim(e.target.value)}
          />
        </Field>

        {/* 2. Gelen para */}
        <Field>
          <Label htmlFor="toplamGelir" hint="$ — Spotify, YouTube, vs. toplam">
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp size={13} style={{ color: "var(--positive)" }} />
              Gelen Toplam Para
            </span>
          </Label>
          <TextInput
            id="toplamGelir"
            type="number"
            placeholder="0"
            value={toplamGelir}
            onChange={(e) => setToplamGelir(e.target.value)}
          />
        </Field>

        {/* 3. Harcama + kategori — yan yana */}
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <Field>
            <Label htmlFor="toplamHarcama" hint="$ — toplam harcama">
              <span className="inline-flex items-center gap-1.5">
                <TrendingDown size={13} style={{ color: "var(--negative)" }} />
                Harcadığımız Para
              </span>
            </Label>
            <TextInput
              id="toplamHarcama"
              type="number"
              placeholder="0"
              value={toplamHarcama}
              onChange={(e) => setToplamHarcama(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="harcamaKategori" hint="ne için?">
              Kategori
            </Label>
            <Select
              id="harcamaKategori"
              value={harcamaKategori}
              onChange={(e) => setHarcamaKategori(e.target.value)}
            >
              <option value="">— Seçilmedi —</option>
              {Object.values(MuzikHarcamaKategori).map((k) => (
                <option key={k} value={k}>
                  {muzikHarcamaKategoriEtiket[k]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* 4. Sanatçılar — yanlarına tutar */}
        <Field>
          <Label htmlFor="sanatciSec" required hint="seçince listeye otomatik düşer">
            Sanatçılar
          </Label>
          {sanatcilar.length > 0 && (
            <div className="mb-2 space-y-2">
              {sanatcilar.map((s) => (
                <div
                  key={s.cariId}
                  className="flex items-center gap-2"
                >
                  <div
                    className="flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium"
                    style={{
                      background: "var(--surface-muted)",
                      borderColor: "var(--border)",
                    }}
                  >
                    {s.ad}
                  </div>
                  <div className="w-48">
                    <TextInput
                      type="number"
                      placeholder="$ Tutar"
                      value={s.tutar}
                      onChange={(e) =>
                        updateSanatci(s.cariId, "tutar", e.target.value)
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSanatci(s.cariId)}
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: "var(--negative)" }}
                    aria-label="Kaldır"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Select
            id="sanatciSec"
            value={secilenSanatciId}
            onChange={(e) => addSanatci(e.target.value)}
          >
            <option value="">
              {mevcutSanatcilar.length === 0
                ? "— Profiller'den sanatçı ekle —"
                : "+ Sanatçı seç (otomatik eklenir)"}
            </option>
            {mevcutSanatcilar
              .filter((s) => !sanatcilar.some((sel) => sel.cariId === s.id))
              .map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.ad}
                </option>
              ))}
          </Select>
          {mevcutSanatcilar.length === 0 && loaded && (
            <p className="mt-1 text-xs" style={{ color: "var(--text-soft)" }}>
              Henüz sanatçı yok.{" "}
              <a
                href="/uygulama/profiller"
                className="underline"
                style={{ color: "var(--brand)" }}
              >
                Profiller
              </a>{" "}
              sayfasından tip=Harcama, harcamaTürü=Sanatçı olarak ekle.
            </p>
          )}
        </Field>

        {/* 3. İşbirlikçiler */}
        <Field>
          <Label htmlFor="isbirlikciYeni" hint="opsiyonel — mix, master, yapımcı vs.">
            İşbirlikçiler
          </Label>
          <div className="flex gap-2">
            <TextInput
              id="isbirlikciYeni"
              placeholder="Örn. Mix: Studio Atlas"
              value={yeniIsbirlikci}
              onChange={(e) => setYeniIsbirlikci(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addIsbirlikci();
                }
              }}
            />
            <Button variant="ghost" size="md" onPress={addIsbirlikci}>
              <Plus size={14} /> Ekle
            </Button>
          </div>
          {isbirlikciler.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {isbirlikciler.map((c, i) => (
                <Chip key={i} label={c} onRemove={() => removeIsbirlikci(i)} />
              ))}
            </div>
          )}
        </Field>

        {/* 4. Yayın mağazaları */}
        <Field>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-medium">Yayın Mağazaları</span>
            <button
              type="button"
              onClick={toggleAllMagaza}
              className="text-xs underline-offset-2 hover:underline"
              style={{ color: "var(--brand)" }}
            >
              Hepsini seç
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(MuzikMagaza).map((m) => {
              const active = magazalar.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMagaza(m)}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                  style={{
                    background: active ? "var(--brand-soft)" : "var(--surface)",
                    color: active ? "var(--brand)" : "var(--text-muted)",
                    borderColor: active
                      ? "color-mix(in oklch, var(--brand) 30%, transparent)"
                      : "var(--border-strong)",
                  }}
                >
                  {active && <span aria-hidden>✓</span>}
                  {muzikMagazaEtiket[m]}
                </button>
              );
            })}
          </div>
        </Field>

        {/* Net Kâr — canlı highlight */}
        <div
          className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
          style={{
            background:
              netKar >= 0 ? "var(--positive-soft)" : "var(--negative-soft)",
            borderColor:
              netKar >= 0
                ? "color-mix(in oklch, var(--positive) 30%, transparent)"
                : "color-mix(in oklch, var(--negative) 30%, transparent)",
          }}
        >
          <span
            className="text-sm font-semibold"
            style={{
              color: netKar >= 0 ? "var(--positive)" : "var(--negative)",
            }}
          >
            Şirket Net Kâr
          </span>
          <span
            className="text-lg font-bold tabular-nums"
            style={{
              color: netKar >= 0 ? "var(--positive)" : "var(--negative)",
            }}
          >
            ${netKar.toLocaleString("en-US")}
          </span>
        </div>

        {/* 6. Varsayılan kasa (sadece harcama girilirse anlamlı) */}
        {harcamaNum > 0 && mevcutKasalar.length > 0 && (
          <Field>
            <Label
              htmlFor="kasaSec"
              hint="harcama bu kasadan çıkar + Borçlar'a otomatik düşer"
            >
              Kasa
            </Label>
            <Select
              id="kasaSec"
              value={kasaId}
              onChange={(e) => setKasaId(e.target.value)}
            >
              <option value="">— Kasa seçme —</option>
              {mevcutKasalar.map((k) => (
                <option key={k.id} value={String(k.id)}>
                  {k.ad} ({k.paraBirimi})
                  {k.varsayilan ? " · varsayılan" : ""}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {/* 7. Notlar */}
        <Field>
          <Label htmlFor="notlar">Notlar</Label>
          <TextArea
            id="notlar"
            rows={2}
            placeholder="Pazarlama stratejisi, yayın tarihi, sözleşme notu vs."
            value={notlar}
            onChange={(e) => setNotlar(e.target.value)}
          />
        </Field>
      </div>
    </DataModal>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
      style={{
        background: "var(--surface-muted)",
        borderColor: "var(--border)",
        color: "var(--text)",
      }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-sm hover:bg-black/10 dark:hover:bg-white/10"
        aria-label="Kaldır"
      >
        <X size={11} />
      </button>
    </span>
  );
}

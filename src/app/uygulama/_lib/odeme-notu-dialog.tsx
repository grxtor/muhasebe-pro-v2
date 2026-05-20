"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { Music, Plus, X } from "lucide-react";
import { DataModal, DialogColumns, DialogColumn } from "@/components/ui/data-modal";
import { DekontList } from "@/components/ui/dekont-list";
import { PendingDekontList } from "@/components/ui/pending-dekont-list";
import { uploadDekontlar } from "@/lib/dekont-actions";
import {
  Field,
  Label,
  Select,
  TextArea,
  TextInput,
  FormGrid,
  FormSection,
  MoneyField,
} from "@/components/ui/form-field";
import { SwitchRow } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import {
  OdemeYonu,
  OdemeDurumu,
  odemeDurumuEtiket,
  CariTipi,
  HarcamaTuru,
  harcamaTuruEtiket,
  MuzikMagaza,
  muzikMagazaEtiket,
  MuzikHarcamaKategori,
  muzikHarcamaKategoriEtiket,
} from "@/lib/enums";
import { formatPara } from "@/lib/format";
import {
  createOdemeNotu,
  updateOdemeNotu,
} from "./odeme-notu-actions";
import type { OdemeNotuRow, CariRef, MuzikRef } from "./odeme-notu-list";

interface Props {
  isOpen: boolean;
  yon: typeof OdemeYonu.Alacak | typeof OdemeYonu.Borc;
  notu: OdemeNotuRow | null;
  cariler: CariRef[];
  muzikler: MuzikRef[];
  muzikEnabled: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function OdemeNotuDialog({
  isOpen,
  yon,
  notu,
  cariler,
  muzikler,
  muzikEnabled,
  onClose,
  onSaved,
}: Props) {
  const isEdit = notu !== null;
  const isAlacak = yon === OdemeYonu.Alacak;
  const labelTekil = isAlacak ? "Gelir" : "Ödeme";
  const [pending, startTransition] = useTransition();

  const [selectedCariId, setSelectedCariId] = useState<number | "">(
    notu?.cariId ?? "",
  );
  const [yeniCariAdi, setYeniCariAdi] = useState<string>("");

  /* Müzik geliri state — Combobox tek alan: mevcut seç ya da yeni yaz */
  const initialMuzikId = detayStrFrom(notu?.detay, "muzikProfilId");
  const initialYeniSarki = detayStrFrom(notu?.detay, "yeniSarkiAdi");
  const initialMuzik = initialMuzikId
    ? muzikler.find((m) => String(m.id) === initialMuzikId) ?? null
    : null;
  const [muzikSecimi, setMuzikSecimi] = useState<{
    id: string | null;
    label: string;
  }>({
    id: initialMuzikId || null,
    label: initialMuzikId ? initialMuzik?.isim ?? "" : initialYeniSarki,
  });

  /* Jenerik müzik-ilişkisi switch — yön'e göre gelir veya harcama olarak yazılır */
  const [isMuzikIliskili, setIsMuzikIliskili] = useState(
    detayBoolFrom(notu?.detay, "isMuzikGeliri") ||
      detayBoolFrom(notu?.detay, "isMuzikHarcamasi") ||
      Boolean(initialMuzikId) ||
      Boolean(detayStrFrom(notu?.detay, "muzikGelirId")) ||
      Boolean(detayStrFrom(notu?.detay, "muzikHarcamaId")),
  );

  /* Borç için harcama kategorisi state'i */
  const [harcamaKategori, setHarcamaKategori] = useState<string>(
    detayStrFrom(notu?.detay, "kategori"),
  );
  const initialSanatciIds = detayIntListFrom(notu?.detay, "sanatciCariIds");
  const [muzikSanatciIds, setMuzikSanatciIds] = useState<number[]>(
    initialSanatciIds.length > 0
      ? initialSanatciIds
      : initialMuzik?.sanatcilar.map((s) => s.id) ?? [],
  );
  const [sanatciOdemeTutarlar, setSanatciOdemeTutarlar] = useState<
    Record<number, string>
  >({});
  const [secilenMuzikSanatciId, setSecilenMuzikSanatciId] = useState("");
  const initialIsbirlikciler = detayLineListFrom(
    notu?.detay,
    "isbirlikciler",
  );
  const [muzikIsbirlikciler, setMuzikIsbirlikciler] = useState(
    (initialIsbirlikciler.length > 0
      ? initialIsbirlikciler
      : initialMuzik?.isbirlikciler ?? []
    ).join("\n"),
  );
  const [yeniMuzikIsbirlikci, setYeniMuzikIsbirlikci] = useState("");
  const initialMagazalar = detayMagazaListFrom(notu?.detay, "magazalar");
  const [muzikMagazalar, setMuzikMagazalar] = useState<MuzikMagaza[]>(
    initialMagazalar.length > 0
      ? initialMagazalar
      : initialMuzik?.magazalar ?? [],
  );
  const [muzikNotlar, setMuzikNotlar] = useState(
    detayStrFrom(notu?.detay, "notlar") || initialMuzik?.notlar || "",
  );

  /* MoneyField'ı controlled hale getir — switch açıkken feedback için */
  const [tutarStr, setTutarStr] = useState<string>(
    notu?.tutar ? String(notu.tutar) : "",
  );
  const [paraBirimiStr, setParaBirimiStr] = useState<string>(
    notu?.paraBirimi ?? "TRY",
  );

  /* Yeni kayıtta dekont pending — submit'te oluşan ID'ye upload (audit/UX) */
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

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

  const selectedMuzik = useMemo(() => {
    const id = Number(muzikSecimi.id);
    return Number.isFinite(id) ? muzikler.find((m) => m.id === id) : null;
  }, [muzikler, muzikSecimi.id]);

  const muzikSanatciOptions = useMemo(
    () =>
      cariler
        .filter(
          (c) =>
            c.tip === CariTipi.Harcama &&
            c.harcamaTuru === HarcamaTuru.Sanatci,
        )
        .map((c) => ({ id: c.id, ad: cariDisplayName(c) })),
    [cariler],
  );

  const selectedMuzikSanatcilar = useMemo(
    () =>
      muzikSanatciIds.map((id) => ({
        id,
        ad:
          muzikSanatciOptions.find((s) => s.id === id)?.ad ??
          selectedMuzik?.sanatcilar.find((s) => s.id === id)?.ad ??
          `#${id}`,
      })),
    [muzikSanatciIds, muzikSanatciOptions, selectedMuzik?.sanatcilar],
  );

  const muzikIsbirlikciList = useMemo(
    () =>
      uniqueStrings(
        muzikIsbirlikciler
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    [muzikIsbirlikciler],
  );

  const sanatciOdemeToplam = useMemo(
    () =>
      Object.values(sanatciOdemeTutarlar).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0,
      ),
    [sanatciOdemeTutarlar],
  );

  const muzikKayitTutari = Number(tutarStr) || 0;
  const muzikNetEtki = isAlacak
    ? muzikKayitTutari - sanatciOdemeToplam
    : -(muzikKayitTutari + sanatciOdemeToplam);

  const hedefCariOptions = useMemo(
    () => cariler.filter((c) => c.tip !== CariTipi.Harcama),
    [cariler],
  );

  async function handleSubmit(formData: FormData) {
    formData.set("yon", yon);
    if (isMuzikIliskili) {
      const currentBaslik = String(formData.get("baslik") ?? "").trim();
      if (!currentBaslik) {
        formData.set("baslik", buildAutoBaslik());
      }
      const currentDetayNot = String(formData.get("detay.sarkiAdi") ?? "").trim();
      const aciklama = String(formData.get("aciklama") ?? "").trim();
      if (!currentDetayNot && aciklama) {
        formData.set("detay.sarkiAdi", aciklama);
      }
    }
    const result = isEdit
      ? await updateOdemeNotu(notu.id, formData)
      : await createOdemeNotu(formData);
    if (result.ok) {
      toast.success(
        isEdit
          ? `${labelTekil} güncellendi`
          : `${labelTekil} oluşturuldu`,
      );
      const data = result.data as
        | { id?: number; warning?: string }
        | undefined;
      if (data?.warning) {
        toast.warning(data.warning, { duration: 6000 });
      }
      /* Yeni kayıt + pending dosyalar varsa şimdi upload et */
      if (!isEdit && data?.id && pendingFiles.length > 0) {
        const fd = new FormData();
        for (const f of pendingFiles) fd.append("dosya", f);
        const upR = await uploadDekontlar(
          { tip: "odemeNotu", id: data.id },
          fd,
        );
        if (upR.ok) {
          toast.success(`${pendingFiles.length} dosya eklendi`);
        } else {
          toast.error(`Dosya yüklenemedi: ${upR.error}`);
        }
      }
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
  const [newDefaultVade] = useState(() => isoDate(new Date().toISOString()));
  const defaultVade = isEdit ? isoDate(notu.vadeTarihi) : newDefaultVade;
  const tarihLabel = isAlacak ? "Gelir Tarihi" : "Vade Tarihi";

  /* Combobox options — müzikler */
  const muzikOptions = muzikler.map((m) => ({
    value: String(m.id),
    label: m.isim,
  }));

  /* Combobox options — cariler — leading icon yok ama hint kullanılabilir */
  const cariOptions = cariler.map((c) => ({
    value: String(c.id),
    label: c.unvan,
    hint: c.kod,
  }));

  const detayPlatform = detayStr("platform");

  function addMuzikSanatci(rawId: string) {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) return;
    if (muzikSanatciIds.includes(id)) return;
    setMuzikSanatciIds((prev) => [...prev, id]);
    setSecilenMuzikSanatciId("");
  }

  function removeMuzikSanatci(id: number) {
    setMuzikSanatciIds((prev) => prev.filter((x) => x !== id));
    setSanatciOdemeTutarlar((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function addMuzikIsbirlikci() {
    const value = yeniMuzikIsbirlikci.trim();
    if (!value) return;
    setMuzikIsbirlikciler((prev) =>
      uniqueStrings([...prev.split("\n"), value]).join("\n"),
    );
    setYeniMuzikIsbirlikci("");
  }

  function removeMuzikIsbirlikci(value: string) {
    setMuzikIsbirlikciler((prev) =>
      prev
        .split("\n")
        .map((x) => x.trim())
        .filter((x) => x && x !== value)
        .join("\n"),
    );
  }

  function toggleMuzikMagaza(magaza: MuzikMagaza) {
    setMuzikMagazalar((prev) =>
      prev.includes(magaza)
        ? prev.filter((x) => x !== magaza)
        : [...prev, magaza],
    );
  }

  function buildAutoBaslik(): string {
    const sarki =
      muzikSecimi.label.trim() ||
      selectedMuzik?.isim ||
      (isAlacak ? "Müzik geliri" : "Müzik harcaması");
    if (isAlacak) return `${sarki} geliri`;
    const kategori = harcamaKategori
      ? muzikHarcamaKategoriEtiket[
          harcamaKategori as keyof typeof muzikHarcamaKategoriEtiket
        ]
      : "harcama";
    return `${sarki} ${kategori}`;
  }

  return (
    <DataModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `${labelTekil} Düzenle` : `Yeni ${labelTekil}`}
      description={
        isEdit
          ? notu.baslik
          : isAlacak
          ? "Gelen tutar ve varsa müzik/platform bilgisi"
          : "Ödenecek tutar bilgisi"
      }
      size="3xl"
      compact
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
      <form id={formKey} action={onAction}>
        <DialogColumns>
          <DialogColumn>
            <MoneyField
              name="tutar"
              currencyName="paraBirimi"
              value={tutarStr}
              currencyValue={paraBirimiStr}
              onValueChange={setTutarStr}
              onCurrencyChange={setParaBirimiStr}
              label="Tutar"
            />

            <FormGrid cols={2}>
          <Field>
            <Label htmlFor="cariId" required>
              Profil
            </Label>
            <Combobox
              id="cariId"
              options={cariOptions}
              value={
                selectedCariId === "" ? null : String(selectedCariId)
              }
              newLabel={
                selectedCariId === "" && yeniCariAdi ? yeniCariAdi : undefined
              }
              placeholder="Profil ara veya yeni ekle…"
              createLabel={(t) =>
                isAlacak
                  ? `Yeni müşteri: "${t}"`
                  : `Yeni tedarikçi: "${t}"`
              }
              emptyHint="Yaz, yeni profil olarak ekleyebilirsin"
              onChange={(sel) => {
                if (sel.isNew) {
                  setSelectedCariId("");
                  setYeniCariAdi(sel.label);
                } else {
                  setSelectedCariId(sel.value ? Number(sel.value) : "");
                  setYeniCariAdi("");
                }
              }}
            />
            <input
              type="hidden"
              name="cariId"
              value={selectedCariId === "" ? "" : String(selectedCariId)}
            />
            <input
              type="hidden"
              name="yeniCariAdi"
              value={selectedCariId === "" ? yeniCariAdi : ""}
            />
          </Field>
          <Field>
            <Label htmlFor="vadeTarihi" required>
              {tarihLabel}
            </Label>
            <TextInput
              id="vadeTarihi"
              name="vadeTarihi"
              type="date"
              required
              defaultValue={defaultVade}
            />
          </Field>
        </FormGrid>

        {!isMuzikIliskili && (
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
                isAlacak ? "ör. Spotify Mart geliri" : "ör. Kira ödemesi"
              }
            />
          </Field>
        )}

        {isEdit && (
          <FormGrid cols={2}>
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
          </FormGrid>
        )}

        {!isMuzikIliskili ? (
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
        ) : (
          <details
            className="rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--border)" }}
          >
            <summary
              className="cursor-pointer text-xs font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Ek bilgiler
            </summary>
            <div className="mt-3 space-y-3">
              <Field>
                <Label htmlFor="baslik">Kayıt adı</Label>
                <TextInput
                  id="baslik"
                  name="baslik"
                  minLength={2}
                  defaultValue={notu?.baslik ?? ""}
                  placeholder={buildAutoBaslik()}
                />
              </Field>
              <Field>
                <Label htmlFor="detay.sarkiAdi">
                  {isAlacak ? "Gelir notu" : "Harcama notu"}
                </Label>
                <TextInput
                  id="detay.sarkiAdi"
                  name="detay.sarkiAdi"
                  defaultValue={detayStr("sarkiAdi")}
                  placeholder={
                    isAlacak
                      ? "Dönem, payout notu"
                      : "Reklam dönemi, hedef ülke, vs."
                  }
                />
              </Field>
              <Field>
                <Label htmlFor="aciklama">Genel açıklama</Label>
                <TextArea
                  id="aciklama"
                  name="aciklama"
                  rows={4}
                  defaultValue={notu?.aciklama ?? ""}
                  placeholder="Ek not, referans no, vs."
                />
              </Field>
            </div>
          </details>
        )}

        {/* Dekont — yeni: pending mode, edit: gerçek liste */}
        {isEdit ? (
          <DekontList
            hedef={{ tip: "odemeNotu", id: notu.id }}
          />
        ) : (
          <PendingDekontList
            files={pendingFiles}
            onChange={setPendingFiles}
          />
        )}
          </DialogColumn>

          <DialogColumn>
            {/* Müzik Geliri — switch yan yana, açıkken alanlar dialog'a doğal akar */}
            {muzikEnabled && (
              <div className="space-y-3">
                <SwitchRow
                  checked={isMuzikIliskili}
                  onChange={setIsMuzikIliskili}
                  label={
                    isAlacak
                      ? "Müzik geliri olarak da kaydet"
                      : "Müzik harcaması olarak da kaydet"
                  }
                  description={
                    isMuzikIliskili && Number(tutarStr) > 0 ? (
                      <>
                        <strong style={{ color: isAlacak ? "var(--positive)" : "var(--warning)" }}>
                          {formatPara(Number(tutarStr), paraBirimiStr)}
                        </strong>{" "}
                        {isAlacak ? "müzik geliri" : "müzik harcaması"} olarak
                        Müzik Ödemeleri ekranına da yansıyacak
                      </>
                    ) : (
                      "Müzik Ödemeleri ekranında da görünür"
                    )
                  }
                  tone={isAlacak ? "positive" : "warning"}
                />
                {/* Hidden flag — server yön'e göre doğru tabloyu seçer */}
                <input
                  type="hidden"
                  name={
                    isAlacak ? "detay.isMuzikGeliri" : "detay.isMuzikHarcamasi"
                  }
                  value={isMuzikIliskili ? "true" : "false"}
                />

                {isMuzikIliskili && (
                  <div className="grid gap-2.5 md:grid-cols-2">
                    {/* Görsel info — tutar bağlantısı her zaman görünür.
                        Ayrı tutar yok: üstteki Tutar = müzik harcaması/geliri tutarı. */}
                    {Number(tutarStr) > 0 ? (
                      <div
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs md:col-span-2"
                        style={{
                          background: isAlacak
                            ? "var(--positive-soft)"
                            : "var(--warning-soft)",
                          borderColor: isAlacak
                            ? "color-mix(in oklch, var(--positive) 30%, transparent)"
                            : "color-mix(in oklch, var(--warning) 30%, transparent)",
                          color: "var(--text)",
                        }}
                      >
                        <span
                          className="font-bold tabular-nums"
                          style={{
                            color: isAlacak
                              ? "var(--positive)"
                              : "var(--warning)",
                          }}
                        >
                          {formatPara(Number(tutarStr), paraBirimiStr)}
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>
                          {isAlacak
                            ? "müzik geliri olarak kaydedilecek"
                            : "müzik harcaması olarak kaydedilecek"}
                        </span>
                      </div>
                    ) : (
                      <div
                        className="rounded-lg border border-dashed px-3 py-2 text-xs md:col-span-2"
                        style={{
                          borderColor: "var(--border-strong)",
                          color: "var(--text-muted)",
                        }}
                      >
                        <span>
                          Üstteki <strong style={{ color: "var(--text)" }}>Tutar</strong>{" "}
                          bu {isAlacak ? "müzik geliri" : "müzik harcaması"} olarak kaydedilir.
                        </span>
                      </div>
                    )}

                    <FormSection
                      title="Şarkı profili"
                      description={
                        muzikSecimi.id
                          ? "Seçili müziğin profil ayarları bu ödeme ile güncellenir."
                          : "Yeni şarkı bu bilgilerle Müzik Ödemeleri tarafında profil olur."
                      }
                      className="md:col-span-2"
                    >
                      <FormGrid cols={2}>
                        <Field>
                          <Label htmlFor="muzikSecim">Şarkı adı</Label>
                          <Combobox
                            id="muzikSecim"
                            options={muzikOptions}
                            value={muzikSecimi.id}
                            newLabel={
                              !muzikSecimi.id && muzikSecimi.label
                                ? muzikSecimi.label
                                : undefined
                            }
                            placeholder="Şarkı ara veya yeni ekle…"
                            createLabel={(t) => `Yeni şarkı: "${t}"`}
                            onChange={(sel) => {
                              setMuzikSecimi({
                                id: sel.isNew ? null : sel.value,
                                label: sel.label,
                              });
                              if (sel.isNew) {
                                setMuzikSanatciIds([]);
                                setSanatciOdemeTutarlar({});
                                setMuzikIsbirlikciler("");
                                setMuzikMagazalar([]);
                                setMuzikNotlar("");
                              } else {
                                const nextMuzik = muzikler.find(
                                  (m) => String(m.id) === sel.value,
                                );
                                if (nextMuzik) {
                                  setMuzikSanatciIds(
                                    nextMuzik.sanatcilar.map((s) => s.id),
                                  );
                                  setSanatciOdemeTutarlar({});
                                  setMuzikIsbirlikciler(
                                    nextMuzik.isbirlikciler.join("\n"),
                                  );
                                  setMuzikMagazalar(nextMuzik.magazalar);
                                  setMuzikNotlar(nextMuzik.notlar ?? "");
                                }
                              }
                            }}
                          />
                          <input
                            type="hidden"
                            name="detay.muzikProfilId"
                            value={muzikSecimi.id ?? ""}
                          />
                          <input
                            type="hidden"
                            name="detay.yeniSarkiAdi"
                            value={!muzikSecimi.id ? muzikSecimi.label : ""}
                          />
                        </Field>

                        {isAlacak ? (
                          <Field>
                            <Label htmlFor="detay.platform">Platform</Label>
                            <Select
                              id="detay.platform"
                              name="detay.platform"
                              defaultValue={detayPlatform}
                            >
                              <option value="">— Belirsiz —</option>
                              {(selectedMuzik?.magazalar.length
                                ? selectedMuzik.magazalar
                                : Object.values(MuzikMagaza)
                              ).map((m) => (
                                <option
                                  key={m}
                                  value={m}
                                  {...({ "data-platform": m } as Record<string, string>)}
                                >
                                  {muzikMagazaEtiket[m]}
                                </option>
                              ))}
                            </Select>
                          </Field>
                        ) : (
                          <Field>
                            <Label htmlFor="detay.kategori">Kategori</Label>
                            <Select
                              id="detay.kategori"
                              name="detay.kategori"
                              value={harcamaKategori}
                              onChange={(e) => setHarcamaKategori(e.target.value)}
                            >
                              <option value="">— Belirsiz —</option>
                              {Object.values(MuzikHarcamaKategori).map((k) => (
                                <option key={k} value={k}>
                                  {muzikHarcamaKategoriEtiket[k]}
                                </option>
                              ))}
                            </Select>
                          </Field>
                        )}
                      </FormGrid>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div
                          className="rounded-lg border px-3 py-2"
                          style={{
                            borderColor: "var(--border)",
                            background: "var(--surface)",
                          }}
                        >
                          <div className="text-[11px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>
                            {isAlacak ? "Gelir" : "Harcama"}
                          </div>
                          <div className="mt-1 text-sm font-bold tabular-nums">
                            {formatPara(muzikKayitTutari, paraBirimiStr)}
                          </div>
                        </div>
                        <div
                          className="rounded-lg border px-3 py-2"
                          style={{
                            borderColor: "var(--border)",
                            background: "var(--surface)",
                          }}
                        >
                          <div className="text-[11px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>
                            Sanatçı ödemesi
                          </div>
                          <div className="mt-1 text-sm font-bold tabular-nums">
                            {formatPara(sanatciOdemeToplam, paraBirimiStr)}
                          </div>
                        </div>
                        <div
                          className="rounded-lg border px-3 py-2"
                          style={{
                            borderColor:
                              muzikNetEtki >= 0
                                ? "color-mix(in oklch, var(--positive) 28%, transparent)"
                                : "color-mix(in oklch, var(--negative) 28%, transparent)",
                            background:
                              muzikNetEtki >= 0
                                ? "var(--positive-soft)"
                                : "var(--negative-soft)",
                          }}
                        >
                          <div className="text-[11px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>
                            Net etki
                          </div>
                          <div
                            className="mt-1 text-sm font-bold tabular-nums"
                            style={{
                              color:
                                muzikNetEtki >= 0
                                  ? "var(--positive)"
                                  : "var(--negative)",
                            }}
                          >
                            {formatPara(muzikNetEtki, paraBirimiStr)}
                          </div>
                        </div>
                      </div>

                      <Field>
                        <Label htmlFor="detay.sanatciSec" hint="müzik profiline yazılır">
                          Sanatçılar ve özel ödemeler
                        </Label>
                        {selectedMuzikSanatcilar.length > 0 ? (
                          <div
                            className="overflow-hidden rounded-lg border"
                            style={{ borderColor: "var(--border)" }}
                          >
                            <div
                              className="hidden items-center gap-2 border-b px-3 py-1.5 text-[11px] font-semibold uppercase sm:grid"
                              style={{
                                gridTemplateColumns: "minmax(0,1fr) 140px 36px",
                                borderColor: "var(--border)",
                                color: "var(--text-muted)",
                              }}
                            >
                              <span>Sanatçı</span>
                              <span>Özel ödeme</span>
                              <span className="sr-only">İşlem</span>
                            </div>
                            {selectedMuzikSanatcilar.map((s) => (
                              <div
                                key={s.id}
                                className="flex flex-col gap-2 border-b px-3 py-2 last:border-b-0 sm:grid sm:items-center"
                                style={{
                                  gridTemplateColumns: "minmax(0,1fr) 140px 36px",
                                  borderColor: "var(--border)",
                                }}
                              >
                                <div className="min-w-0 truncate text-sm font-medium">
                                  {s.ad}
                                </div>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="Ödeme"
                                  className="min-w-0 rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-offset-0 sm:w-[140px]"
                                  style={{
                                    background: "var(--surface)",
                                    borderColor: "var(--border-strong)",
                                    color: "var(--text)",
                                  }}
                                  value={sanatciOdemeTutarlar[s.id] ?? ""}
                                  onChange={(e) =>
                                    setSanatciOdemeTutarlar((prev) => ({
                                      ...prev,
                                      [s.id]: e.target.value,
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() => removeMuzikSanatci(s.id)}
                                  className="inline-flex size-8 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5 sm:justify-self-end"
                                  style={{ color: "var(--negative)" }}
                                  aria-label="Sanatçıyı kaldır"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            className="rounded-lg border border-dashed px-3 py-3 text-xs"
                            style={{
                              borderColor: "var(--border-strong)",
                              color: "var(--text-muted)",
                            }}
                          >
                            Bu şarkıya henüz sanatçı bağlanmadı.
                          </div>
                        )}
                        <Select
                          id="detay.sanatciSec"
                          value={secilenMuzikSanatciId}
                          onChange={(e) => {
                            addMuzikSanatci(e.target.value);
                            setSecilenMuzikSanatciId("");
                          }}
                        >
                          <option value="">
                            {muzikSanatciOptions.length === 0
                              ? "— Profiller'den sanatçı ekle —"
                              : "+ Sanatçı seç"}
                          </option>
                          {muzikSanatciOptions
                            .filter((s) => !muzikSanatciIds.includes(s.id))
                            .map((s) => (
                              <option key={s.id} value={String(s.id)}>
                                {s.ad}
                              </option>
                            ))}
                        </Select>
                        <input
                          type="hidden"
                          name="detay.sanatciCariIds"
                          value={muzikSanatciIds.join(",")}
                        />
                        <input
                          type="hidden"
                          name="detay.sanatciOdemeleri"
                          value={JSON.stringify(
                            muzikSanatciIds
                              .map((id) => ({
                                cariId: id,
                                tutar: Number(sanatciOdemeTutarlar[id]),
                              }))
                              .filter((x) => Number.isFinite(x.tutar) && x.tutar > 0),
                          )}
                        />
                      </Field>

                      <Field>
                        <Label htmlFor="detay.isbirlikciYeni" hint="mix, master, yapımcı">
                          İşbirlikçiler
                        </Label>
                        <div className="flex gap-2">
                          <TextInput
                            id="detay.isbirlikciYeni"
                            value={yeniMuzikIsbirlikci}
                            onChange={(e) => setYeniMuzikIsbirlikci(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addMuzikIsbirlikci();
                              }
                            }}
                            placeholder="Örn. Mix: Studio Atlas"
                          />
                          <Button variant="ghost" size="md" onPress={addMuzikIsbirlikci}>
                            <Plus size={14} /> Ekle
                          </Button>
                        </div>
                        {muzikIsbirlikciList.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {muzikIsbirlikciList.map((label) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => removeMuzikIsbirlikci(label)}
                                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                                style={{
                                  background: "var(--surface)",
                                  borderColor: "var(--border-strong)",
                                  color: "var(--text-muted)",
                                }}
                              >
                                {label}
                                <X size={12} />
                              </button>
                            ))}
                          </div>
                        )}
                        <input
                          type="hidden"
                          name="detay.isbirlikciler"
                          value={muzikIsbirlikciList.join("\n")}
                        />
                      </Field>

                      <Field>
                        <div className="mb-1.5 flex items-baseline justify-between gap-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text)" }}>
                            <Music size={13} />
                            Yayın mağazaları
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setMuzikMagazalar(
                                muzikMagazalar.length === Object.values(MuzikMagaza).length
                                  ? []
                                  : (Object.values(MuzikMagaza) as MuzikMagaza[]),
                              )
                            }
                            className="text-xs underline-offset-2 hover:underline"
                            style={{ color: "var(--brand)" }}
                          >
                            Hepsini seç
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.values(MuzikMagaza).map((m) => {
                            const active = muzikMagazalar.includes(m);
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => toggleMuzikMagaza(m)}
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
                        <input type="hidden" name="detay.magazalar" value={muzikMagazalar.join(",")} />
                      </Field>

                      <Field>
                        <Label htmlFor="detay.notlar">Müzik profil notu</Label>
                        <TextArea
                          id="detay.notlar"
                          name="detay.notlar"
                          rows={2}
                          value={muzikNotlar}
                          onChange={(e) => setMuzikNotlar(e.target.value)}
                          placeholder="Yayın tarihi, sözleşme notu, pazarlama stratejisi..."
                        />
                      </Field>
                    </FormSection>

                    <input
                      type="hidden"
                      name={
                        isAlacak ? "detay.muzikGelirId" : "detay.muzikHarcamaId"
                      }
                      value={
                        isAlacak
                          ? detayStr("muzikGelirId")
                          : detayStr("muzikHarcamaId")
                      }
                    />
                  </div>
                )}
              </div>
            )}

            {/* Harcama detayları — promosyon / ticaret / avans */}
            {harcamaTuru === HarcamaTuru.Promosyon && (
              <FormSection
                title={`Promosyon — ${harcamaTuruEtiket.Promosyon}`}
              >
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
                <FormGrid cols={2}>
                  <Field>
                    <Label htmlFor="detay.videoBasligi">Video</Label>
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
                </FormGrid>
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
              </FormSection>
            )}

            {harcamaTuru === HarcamaTuru.Ticaret && (
              <FormSection title="Ticaret">
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
              </FormSection>
            )}

            {harcamaTuru === HarcamaTuru.Avans && (
              <FormSection title="Avans">
                <FormGrid cols={2}>
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
                      Geri Ödenen
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
                </FormGrid>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium">
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
              </FormSection>
            )}
          </DialogColumn>
        </DialogColumns>
      </form>
    </DataModal>
  );
}

function isoDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function detayStrFrom(
  detay: Record<string, unknown> | null | undefined,
  key: string,
): string {
  if (!detay) return "";
  const v = detay[key];
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : String(v);
}

function detayBoolFrom(
  detay: Record<string, unknown> | null | undefined,
  key: string,
): boolean {
  if (!detay) return false;
  const v = detay[key];
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true" || v === "on";
  return false;
}

function detayIntListFrom(
  detay: Record<string, unknown> | null | undefined,
  key: string,
): number[] {
  if (!detay) return [];
  const v = detay[key];
  const values = Array.isArray(v)
    ? v
    : typeof v === "string"
      ? v.split(",")
      : [];
  return [...new Set(
    values
      .map((x) => Number(String(x).trim()))
      .filter((n) => Number.isInteger(n) && n > 0),
  )];
}

function detayLineListFrom(
  detay: Record<string, unknown> | null | undefined,
  key: string,
): string[] {
  if (!detay) return [];
  const v = detay[key];
  const values = Array.isArray(v)
    ? v
    : typeof v === "string"
      ? v.split("\n")
      : [];
  return [...new Set(values.map((x) => String(x).trim()).filter(Boolean))];
}

function detayMagazaListFrom(
  detay: Record<string, unknown> | null | undefined,
  key: string,
): MuzikMagaza[] {
  if (!detay) return [];
  const valid = new Set(Object.values(MuzikMagaza) as string[]);
  const v = detay[key];
  const values = Array.isArray(v)
    ? v
    : typeof v === "string"
      ? v.split(",")
      : [];
  return [...new Set(
    values
      .map((x) => String(x).trim())
      .filter((x): x is MuzikMagaza => valid.has(x)),
  )];
}

function cariDisplayName(c: { kod: string; unvan: string }): string {
  return c.kod && c.kod.trim() && c.kod !== c.unvan ? c.kod : c.unvan;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((x) => x.trim()).filter(Boolean))];
}

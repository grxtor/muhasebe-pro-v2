"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { X } from "lucide-react";
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
import { SwitchRow } from "@/components/ui/switch";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { MuzikMagaza, muzikMagazaEtiket } from "@/lib/enums";
import { createMuzikGelir, createMuzikGelirBatch } from "../actions";

interface Props {
  open: boolean;
  onClose: () => void;
  muzikProfilId: number;
  muzikIsim: string;
  bagliMagazalar: MuzikMagaza[];
}

interface PlatformEntry {
  platform: MuzikMagaza;
  tutar: string;
}

export function GelirDialog({
  open,
  onClose,
  muzikProfilId,
  muzikIsim,
  bagliMagazalar,
}: Props) {
  if (!open) return null;
  return (
    <GelirDialogInner
      onClose={onClose}
      muzikProfilId={muzikProfilId}
      muzikIsim={muzikIsim}
      bagliMagazalar={bagliMagazalar}
    />
  );
}

function GelirDialogInner({
  onClose,
  muzikProfilId,
  muzikIsim,
  bagliMagazalar,
}: {
  onClose: () => void;
  muzikProfilId: number;
  muzikIsim: string;
  bagliMagazalar: MuzikMagaza[];
}) {
  const router = useRouter();
  const bugun = new Date().toISOString().slice(0, 10);
  const [tarih, setTarih] = useState(bugun);
  const [platform, setPlatform] = useState<string>("");
  const [tutar, setTutar] = useState("");
  const [paraBirimi, setParaBirimi] = useState("USD");
  const [not, setNot] = useState("");
  const [saving, setSaving] = useState(false);

  /* Platform-bazlı detay */
  const [breakdownActive, setBreakdownActive] = useState(false);
  const [entries, setEntries] = useState<PlatformEntry[]>(
    bagliMagazalar.length > 0
      ? bagliMagazalar.map((p) => ({ platform: p, tutar: "" }))
      : [{ platform: MuzikMagaza.Spotify, tutar: "" }],
  );

  const breakdownTotal = entries.reduce(
    (acc, e) => acc + (Number(e.tutar) || 0),
    0,
  );

  function updateEntry(i: number, patch: Partial<PlatformEntry>) {
    setEntries((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    );
  }

  function addEntry() {
    const used = new Set(entries.map((e) => e.platform));
    const next = (Object.values(MuzikMagaza) as MuzikMagaza[]).find(
      (m) => !used.has(m),
    );
    setEntries((prev) => [
      ...prev,
      { platform: next ?? MuzikMagaza.Diger, tutar: "" },
    ]);
  }

  function removeEntry(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function saveOne(p: MuzikMagaza | "", amount: string) {
    const fd = new FormData();
    fd.set("muzikProfilId", String(muzikProfilId));
    fd.set("tarih", tarih);
    fd.set("tutar", amount);
    fd.set("paraBirimi", paraBirimi);
    if (p) fd.set("platform", p);
    if (not) fd.set("not", not);
    return createMuzikGelir(fd);
  }

  async function handleSave() {
    if (breakdownActive) {
      const valid = entries.filter((e) => Number(e.tutar) > 0);
      if (valid.length === 0) {
        toast.error("En az bir platform için tutar girilmeli");
        return;
      }
      setSaving(true);
      /* Atomik batch — tek transaction, all-or-nothing (audit #15) */
      const fd = new FormData();
      fd.set("muzikProfilId", String(muzikProfilId));
      fd.set("tarih", tarih);
      fd.set("paraBirimi", paraBirimi);
      if (not) fd.set("not", not);
      valid.forEach((e, i) => {
        fd.set(`entry_${i}_platform`, e.platform);
        fd.set(`entry_${i}_tutar`, e.tutar);
      });
      const r = await createMuzikGelirBatch(fd);
      setSaving(false);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`${r.data?.created ?? valid.length} platform için gelir eklendi`);
      router.refresh();
      onClose();
      return;
    }

    /* Tek gelir */
    if (!tutar || Number(tutar) <= 0) {
      toast.error("Tutar girilmeli");
      return;
    }
    setSaving(true);
    const r = await saveOne(platform as MuzikMagaza | "", tutar);
    setSaving(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Gelir eklendi");
    router.refresh();
    onClose();
  }

  const onerilenler = bagliMagazalar.length > 0 ? bagliMagazalar : null;
  const allPlatforms = Object.values(MuzikMagaza) as MuzikMagaza[];

  return (
    <DataModal
      isOpen={true}
      onClose={onClose}
      size="xl"
      title="Yeni Gelir"
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
        {/* Tutar — tek/topla görünür şekilde */}
        {breakdownActive ? (
          <div
            className="rounded-lg border p-3"
            style={{
              background: "var(--surface-muted)",
              borderColor: "var(--border)",
            }}
          >
            <div
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              Toplam
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {breakdownTotal.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--text-muted)" }}
              >
                {paraBirimi}
              </span>
            </div>
            <div
              className="mt-1 text-[11px]"
              style={{ color: "var(--text-soft)" }}
            >
              {entries.filter((e) => Number(e.tutar) > 0).length} platformdan
              otomatik hesaplandı
            </div>
          </div>
        ) : (
          <MoneyField
            name="tutar"
            currencyName="paraBirimi"
            currencies={["USD", "TRY", "EUR", "GBP"]}
            value={tutar}
            currencyValue={paraBirimi}
            onValueChange={setTutar}
            onCurrencyChange={setParaBirimi}
          />
        )}

        <FormGrid cols={2}>
          <Field>
            <Label htmlFor="tarih" required>
              Tarih
            </Label>
            <TextInput
              id="tarih"
              name="tarih"
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
            />
          </Field>

          {!breakdownActive && (
            <Field>
              <Label htmlFor="platform" hint="opsiyonel">
                Platform
              </Label>
              <Select
                id="platform"
                name="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="">— Belirsiz —</option>
                {onerilenler &&
                  onerilenler.map((m) => (
                    <option
                      key={`o-${m}`}
                      value={m}
                      {...({ "data-platform": m } as Record<string, string>)}
                    >
                      {muzikMagazaEtiket[m]} (bu müziğe bağlı)
                    </option>
                  ))}
                {allPlatforms
                  .filter((m) => !onerilenler || !onerilenler.includes(m))
                  .map((m) => (
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
          )}
        </FormGrid>

        <SwitchRow
          checked={breakdownActive}
          onChange={setBreakdownActive}
          label="Platform bazlı detaylı giriş"
          description="Her platformdan ne kadar geldiğini ayrı ayrı gir; toplam otomatik hesaplanır."
          tone="positive"
        />

        {breakdownActive && (
          <div className="space-y-2">
            <div
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              Hangi platformlardan?
            </div>
            <div className="space-y-1.5">
              {entries.map((e, i) => (
                <div
                  key={`${e.platform}-${i}`}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  <PlatformIcon platform={e.platform} size={22} />
                  <span className="flex-1 text-sm font-medium">
                    {muzikMagazaEtiket[e.platform]}
                  </span>
                  <div className="relative">
                    <span
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold"
                      style={{ color: "var(--text-soft)" }}
                    >
                      {paraBirimi === "USD"
                        ? "$"
                        : paraBirimi === "EUR"
                        ? "€"
                        : paraBirimi === "GBP"
                        ? "£"
                        : "₺"}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={e.tutar}
                      onChange={(ev) =>
                        updateEntry(i, { tutar: ev.target.value })
                      }
                      className="w-32 rounded-lg border py-1.5 pl-6 pr-3 text-sm font-semibold tabular-nums outline-none [appearance:textfield] focus:ring-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      style={{
                        background: "var(--surface-muted)",
                        borderColor: "var(--border-strong)",
                        color: "var(--text)",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEntry(i)}
                    aria-label="Çıkar"
                    className="shrink-0 rounded-md p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    style={{ color: "var(--text-soft)" }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Eklenebilecek diğer platformlar — sadece logolu butonlar */}
            {(() => {
              const used = new Set(entries.map((e) => e.platform));
              const available = allPlatforms.filter((m) => !used.has(m));
              if (available.length === 0) return null;
              return (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--text-soft)" }}
                  >
                    + Ekle:
                  </span>
                  {available.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        setEntries((prev) => [...prev, { platform: m, tutar: "" }])
                      }
                      title={muzikMagazaEtiket[m]}
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                      style={{
                        background: "var(--surface)",
                        borderColor: "var(--border)",
                        color: "var(--text-muted)",
                      }}
                    >
                      <PlatformIcon platform={m} size={12} />
                      <span>{muzikMagazaEtiket[m]}</span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        <Field>
          <Label htmlFor="gelirNot" hint="opsiyonel">
            Not
          </Label>
          <TextArea
            id="gelirNot"
            name="not"
            rows={2}
            placeholder="Şubat Spotify payout, content ID claim, vs."
            value={not}
            onChange={(e) => setNot(e.target.value)}
          />
        </Field>
      </div>
    </DataModal>
  );
}

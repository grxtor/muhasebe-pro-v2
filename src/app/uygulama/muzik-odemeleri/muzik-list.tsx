"use client";

import {
  useState,
  useMemo,
  useDeferredValue,
  useEffect,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";
import {
  Plus,
  Music,
  Search,
  TrendingUp,
  TrendingDown,
  Eye,
  List,
  CalendarRange,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TextInput } from "@/components/ui/form-field";
import { EditableCell } from "@/components/ui/editable-cell";
import { ViewToggle } from "@/components/ui/month-accordion";
import { type MuzikMagaza } from "@/lib/enums";
import { PlatformAvatarStack } from "@/components/ui/platform-icon";
import { StatStrip } from "./_stat-strip";
import { MuzikDialog } from "./muzik-dialog";
import { patchMuzikProfilIsim } from "./actions";

export interface MuzikListProfil {
  id: number;
  slug: string;
  isim: string;
  sanatcilar: { id: number; ad: string }[];
  magazalar: MuzikMagaza[];
}

interface AylikDeger {
  gelir: number;
  harcama: number;
  sanatci: number;
}

interface Row {
  profil: MuzikListProfil;
  ozet: {
    toplamGelir: number;
    toplamHarcama: number;
    toplamSanatciOdemesi: number;
    sirketKar: number;
  };
  aylik: Record<string, AylikDeger>;
}

type PivotMetrik = "gelir" | "kar";

interface Props {
  rows: Row[];
  icon?: React.ReactNode;
}

export function MuzikList({ rows, icon }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [localQ, setLocalQ] = useState(params.get("q") ?? "");
  const deferredQ = useDeferredValue(localQ);

  useEffect(() => {
    const url = new URLSearchParams(params.toString());
    if (deferredQ) url.set("q", deferredQ);
    else url.delete("q");
    startTransition(() => {
      router.replace(`/uygulama/muzik-odemeleri?${url.toString()}`, {
        scroll: false,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<"liste" | "pivot">("liste");
  const [pivotMetrik, setPivotMetrik] = useState<PivotMetrik>("gelir");

  const ozet = rows.reduce(
    (acc, r) => {
      acc.gelir += r.ozet.toplamGelir;
      acc.harcama += r.ozet.toplamHarcama;
      acc.sanatci += r.ozet.toplamSanatciOdemesi;
      acc.kar += r.ozet.sirketKar;
      return acc;
    },
    { gelir: 0, harcama: 0, sanatci: 0, kar: 0 },
  );

  return (
    <div className="space-y-4">
      <PageHeader
        icon={icon ?? <Music size={20} />}
        title="Müzik Ödemeleri"
        subtitle="Dağıttığın müzikler — gelir, harcama, sanatçı ödemeleri ve şirket net kâr takibi"
        actions={
          <Button
            variant="primary"
            size="md"
            onPress={() => setDialogOpen(true)}
          >
            <Plus size={16} /> Yeni Müzik
          </Button>
        }
      />

      <StatStrip
        items={[
          { label: "Toplam Müzik", value: rows.length.toString() },
          {
            label: "Gelir",
            value: `$${ozet.gelir.toLocaleString("en-US")}`,
            tone: "positive",
          },
          {
            label: "Harcama",
            value: `$${ozet.harcama.toLocaleString("en-US")}`,
            tone: "negative",
          },
          {
            label: "Sanatçı",
            value: `$${ozet.sanatci.toLocaleString("en-US")}`,
          },
          {
            label: "Net Kâr",
            value: `$${ozet.kar.toLocaleString("en-US")}`,
            tone: ozet.kar >= 0 ? "positive" : "negative",
            emphasized: true,
          },
        ]}
      />

      <div
        className="flex items-center gap-3 rounded-xl border p-3"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="relative flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
            style={{ color: "var(--text-soft)" }}
          />
          <TextInput
            placeholder="Müzik adı veya sanatçı ara…"
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            className="!pl-9"
          />
        </div>
        {view === "pivot" && (
          <ViewToggle
            value={pivotMetrik}
            onChange={(v) => setPivotMetrik(v as PivotMetrik)}
            options={[
              { value: "gelir", label: "Gelir" },
              { value: "kar", label: "Net Kâr" },
            ]}
          />
        )}
        <ViewToggle
          value={view}
          onChange={(v) => setView(v as "liste" | "pivot")}
          options={[
            { value: "liste", label: "Liste", icon: <List size={12} /> },
            { value: "pivot", label: "Aylık", icon: <CalendarRange size={12} /> },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Music size={24} />}
          title="Henüz müzik yok"
          description="Dağıtmış olduğun ilk müziği ekle, harcamaları ve gelirleri buradan takip et."
          action={
            <Button
              variant="primary"
              size="md"
              onPress={() => setDialogOpen(true)}
            >
              <Plus size={16} /> İlk müziği ekle
            </Button>
          }
        />
      ) : view === "pivot" ? (
        <MuzikPivot rows={rows} metrik={pivotMetrik} />
      ) : (
        <MuzikTable rows={rows} />
      )}

      <MuzikDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

const AY_KISA = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

/** "2026-05" → "May 26" */
function ayEtiket(key: string): string {
  const [y, m] = key.split("-");
  return `${AY_KISA[Number(m) - 1] ?? m} ${y.slice(2)}`;
}

function metrikDeger(v: AylikDeger, metrik: PivotMetrik): number {
  if (metrik === "gelir") return v.gelir;
  return v.gelir - v.harcama - v.sanatci; // net kâr
}

/**
 * Pivot tablo — Excel-tarzı: satır=şarkı, sütun=ay, hücre=metrik (gelir/kâr).
 * Sağda satır toplamı, altta aylık toplam.
 */
function MuzikPivot({ rows, metrik }: { rows: Row[]; metrik: PivotMetrik }) {
  /* Tüm hesaplama useMemo içinde — render-dışı, React compiler güvenli */
  const { ayKeys, satirlar, ayToplam, genelToplam } = useMemo(() => {
    const keys = Array.from(
      new Set(rows.flatMap((r) => Object.keys(r.aylik))),
    ).sort();

    /* Satırlar — tamamen saf (mutation yok) */
    const sat = rows.map((r) => {
      const hucreler = keys.map((k) => {
        const v = r.aylik[k];
        return v ? metrikDeger(v, metrik) : 0;
      });
      const satirToplam = hucreler.reduce((a, b) => a + b, 0);
      return { profil: r.profil, hucreler, satirToplam };
    });

    /* Sütun toplamları — her ay için satırlardaki o sütunu topla */
    const toplam = Object.fromEntries(
      keys.map((k, idx) => [
        k,
        sat.reduce((acc, s) => acc + s.hucreler[idx], 0),
      ]),
    );

    const genel = sat.reduce((acc, s) => acc + s.satirToplam, 0);

    return {
      ayKeys: keys,
      satirlar: sat,
      ayToplam: toplam,
      genelToplam: genel,
    };
  }, [rows, metrik]);

  if (ayKeys.length === 0) {
    return (
      <div
        className="rounded-xl border px-4 py-10 text-center text-sm"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text-muted)",
        }}
      >
        Henüz tarihli gelir/gider kaydı yok — pivot için veri gerekli.
      </div>
    );
  }

  const renkli = (n: number) =>
    metrik === "kar"
      ? n > 0
        ? "var(--positive)"
        : n < 0
        ? "var(--negative)"
        : "var(--text-soft)"
      : n > 0
      ? "var(--positive)"
      : "var(--text-soft)";

  const fmt = (n: number) =>
    n === 0 ? "—" : `$${n.toLocaleString("en-US")}`;

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead
            className="border-b text-[11px] font-semibold uppercase tracking-wider"
            style={{
              background: "var(--surface-muted)",
              borderColor: "var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <tr>
              <th
                className="sticky left-0 z-10 px-4 py-2.5 text-left"
                style={{ background: "var(--surface-muted)" }}
              >
                Müzik
              </th>
              {ayKeys.map((k) => (
                <th key={k} className="px-3 py-2.5 text-right whitespace-nowrap">
                  {ayEtiket(k)}
                </th>
              ))}
              <th className="px-4 py-2.5 text-right">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((s, i) => (
              <tr
                key={s.profil.id}
                className="transition-colors hover:bg-[color-mix(in_oklch,var(--accent)_5%,transparent)]"
                style={{
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                <td
                  className="sticky left-0 z-10 px-4 py-2.5"
                  style={{ background: "var(--surface)" }}
                >
                  <Link
                    href={`/uygulama/muzik-odemeleri/${s.profil.slug}`}
                    className="font-medium hover:underline"
                  >
                    {s.profil.isim}
                  </Link>
                </td>
                {s.hucreler.map((deger, idx) => (
                  <td
                    key={ayKeys[idx]}
                    className="px-3 py-2.5 text-right tabular-nums"
                    style={{ color: renkli(deger) }}
                  >
                    {fmt(deger)}
                  </td>
                ))}
                <td
                  className="px-4 py-2.5 text-right font-bold tabular-nums"
                  style={{ color: renkli(s.satirToplam) }}
                >
                  {fmt(s.satirToplam)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot
            className="border-t font-semibold"
            style={{
              background: "var(--surface-muted)",
              borderColor: "var(--border)",
            }}
          >
            <tr>
              <td
                className="sticky left-0 z-10 px-4 py-2.5 text-left text-xs uppercase tracking-wider"
                style={{
                  background: "var(--surface-muted)",
                  color: "var(--text-muted)",
                }}
              >
                Aylık Toplam
              </td>
              {ayKeys.map((k) => (
                <td
                  key={k}
                  className="px-3 py-2.5 text-right tabular-nums"
                  style={{ color: renkli(ayToplam[k]) }}
                >
                  {fmt(ayToplam[k])}
                </td>
              ))}
              <td
                className="px-4 py-2.5 text-right tabular-nums"
                style={{ color: renkli(genelToplam) }}
              >
                {fmt(genelToplam)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function MuzikTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead
            className="border-b text-left text-[11px] font-semibold uppercase tracking-wider"
            style={{
              background: "var(--surface-muted)",
              borderColor: "var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <tr>
              <th className="px-4 py-2.5">Müzik</th>
              <th className="px-4 py-2.5">Platformlar</th>
              <th className="px-4 py-2.5 text-right">Gelir</th>
              <th className="px-4 py-2.5 text-right">Harcama</th>
              <th className="px-4 py-2.5 text-right">Sanatçı</th>
              <th className="px-4 py-2.5 text-right">Net Kâr</th>
              <th className="w-12 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ profil, ozet }, i) => {
              const karIyi = ozet.sirketKar >= 0;
              const detailUrl = `/uygulama/muzik-odemeleri/${profil.slug}`;
              return (
                <tr
                  key={profil.id}
                  className="group transition-colors hover:bg-[color-mix(in_oklch,var(--accent)_5%,transparent)]"
                  style={{
                    borderTop:
                      i === 0 ? "none" : "1px solid var(--border)",
                  }}
                >
                  <td className="px-2 py-2">
                    <EditableCell
                      type="text"
                      value={profil.isim}
                      display={
                        <span className="font-medium leading-tight">
                          {profil.isim}
                        </span>
                      }
                      onSave={async (next) => {
                        const r = await patchMuzikProfilIsim(profil.id, next);
                        if (r.ok) {
                          router.refresh();
                          return true;
                        }
                        toast.error(r.error);
                        return false;
                      }}
                    />
                    {profil.sanatcilar.length > 0 && (
                      <div
                        className="mt-0.5 truncate px-2 text-xs"
                        style={{ color: "var(--text-soft)" }}
                      >
                        {profil.sanatcilar.map((s) => s.ad).join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {profil.magazalar.length > 0 ? (
                      <PlatformAvatarStack
                        platforms={profil.magazalar}
                        size={20}
                        max={5}
                      />
                    ) : (
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-soft)" }}
                      >
                        —
                      </span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-semibold tabular-nums"
                    style={{ color: "var(--positive)" }}
                  >
                    ${ozet.toplamGelir.toLocaleString("en-US")}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-semibold tabular-nums"
                    style={{ color: "var(--negative)" }}
                  >
                    ${ozet.toplamHarcama.toLocaleString("en-US")}
                  </td>
                  <td
                    className="px-4 py-3 text-right tabular-nums"
                    style={{ color: "var(--text-muted)" }}
                  >
                    ${ozet.toplamSanatciOdemesi.toLocaleString("en-US")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums"
                      style={{
                        background: karIyi
                          ? "var(--positive-soft)"
                          : "var(--negative-soft)",
                        color: karIyi ? "var(--positive)" : "var(--negative)",
                      }}
                    >
                      {karIyi ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      ${ozet.sirketKar.toLocaleString("en-US")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={detailUrl}
                      aria-label="Detay"
                      title="Detayı aç"
                      className="inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Eye size={14} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState, useDeferredValue, useEffect, useTransition } from "react";
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
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TextInput } from "@/components/ui/form-field";
import { muzikMagazaEtiket, type MuzikMagaza } from "@/lib/enums";
import { StatStrip } from "./_stat-strip";
import { MuzikDialog } from "./muzik-dialog";

export interface MuzikListProfil {
  id: number;
  slug: string;
  isim: string;
  sanatcilar: { id: number; ad: string }[];
  magazalar: MuzikMagaza[];
}

interface Row {
  profil: MuzikListProfil;
  ozet: {
    toplamGelir: number;
    toplamHarcama: number;
    toplamSanatciOdemesi: number;
    sirketKar: number;
  };
}

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
      ) : (
        <MuzikTable rows={rows} />
      )}

      <MuzikDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

function MuzikTable({ rows }: { rows: Row[] }) {
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
            className="border-b text-left text-xs font-semibold uppercase tracking-wide"
            style={{
              background: "var(--surface-muted)",
              borderColor: "var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <tr>
              <th className="px-4 py-3">Müzik</th>
              <th className="px-4 py-3">Mağazalar</th>
              <th className="px-4 py-3 text-right">Gelir</th>
              <th className="px-4 py-3 text-right">Harcama</th>
              <th className="px-4 py-3 text-right">Sanatçı</th>
              <th className="px-4 py-3 text-right">Net Kâr</th>
              <th className="px-4 py-3 text-right">Detay</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ profil, ozet }) => {
              const karIyi = ozet.sirketKar >= 0;
              return (
                <tr
                  key={profil.id}
                  className="border-b transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.025]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/uygulama/muzik-odemeleri/${profil.slug}`}
                      className="block"
                    >
                      <div className="font-medium hover:underline">
                        {profil.isim}
                      </div>
                      <div
                        className="mt-0.5 text-xs"
                        style={{ color: "var(--text-soft)" }}
                      >
                        {profil.sanatcilar.map((s) => s.ad).join(", ")}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {profil.magazalar.slice(0, 3).map((m) => (
                        <MagazaChip key={m} magaza={m} />
                      ))}
                      {profil.magazalar.length > 3 && (
                        <span
                          className="text-[10px]"
                          style={{ color: "var(--text-soft)" }}
                        >
                          +{profil.magazalar.length - 3}
                        </span>
                      )}
                    </div>
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
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums"
                      style={{
                        background: karIyi
                          ? "var(--positive-soft)"
                          : "var(--negative-soft)",
                        color: karIyi ? "var(--positive)" : "var(--negative)",
                      }}
                    >
                      {karIyi ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      ${ozet.sirketKar.toLocaleString("en-US")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/uygulama/muzik-odemeleri/${profil.slug}`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ color: "var(--brand)" }}
                    >
                      <Eye size={12} />
                      Detay
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

function MagazaChip({ magaza }: { magaza: MuzikMagaza }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        background: "var(--brand-soft)",
        color: "var(--brand)",
      }}
    >
      {muzikMagazaEtiket[magaza]}
    </span>
  );
}

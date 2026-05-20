"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import {
  ArrowLeft,
  Plus,
  Music,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Pencil,
  Trash2,
  ExternalLink,
  Link2,
  List,
  CalendarRange,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  muzikMagazaEtiket,
  muzikHarcamaKategoriEtiket,
  type MuzikMagaza,
  type MuzikHarcamaKategori,
} from "@/lib/enums";
import { formatPara } from "@/lib/format";
import { StatStrip } from "../_stat-strip";
import {
  PlatformAvatarStack,
  PlatformIcon,
  PlatformRevenueRow,
  platformDisplayName,
} from "@/components/ui/platform-icon";
import { MonthAccordion, ViewToggle } from "@/components/ui/month-accordion";
import { deleteMuzikGelir, deleteMuzikHarcama, deleteSanatciOdemesi } from "../actions";
import { GelirDialog } from "./gelir-dialog";
import { HarcamaDialog } from "./harcama-dialog";
import { SanatciOdemesiDialog } from "./sanatci-odemesi-dialog";
import { MuzikProfilEditDialog } from "./muzik-profil-edit-dialog";

export interface MuzikDetailProfil {
  id: number;
  slug: string;
  isim: string;
  isbirlikciler: string[];
  magazalar: MuzikMagaza[];
  notlar: string | null;
  olusturmaTarihi: string;
  sanatcilar: { id: number; ad: string }[];
  gelirler: {
    id: number;
    tarih: string;
    platform: MuzikMagaza | null;
    tutar: number;
    paraBirimi: string;
    not: string | null;
  }[];
  harcamalar: {
    id: number;
    tarih: string;
    kategori: MuzikHarcamaKategori | null;
    tutar: number;
    paraBirimi: string;
    not: string | null;
    borclaraYansit: boolean;
    promoter: { id: number; ad: string } | null;
    kasa: { id: number; ad: string } | null;
  }[];
  sanatciOdemeleri: {
    id: number;
    tarih: string;
    sanatci: { id: number; ad: string };
    tutar: number;
    paraBirimi: string;
    not: string | null;
    borclaraYansit: boolean;
  }[];
}

export interface PromoterOption {
  id: number;
  ad: string;
  fiyat: number | null;
  tier: string | null;
}

export interface KasaOption {
  id: number;
  ad: string;
  paraBirimi: string;
  varsayilan: boolean;
}

export type SanatciOdemesiRow = MuzikDetailProfil["sanatciOdemeleri"][number];

interface Props {
  profil: MuzikDetailProfil;
  ozet: {
    toplamGelir: number;
    toplamHarcama: number;
    toplamSanatciOdemesi: number;
    sirketKar: number;
  };
  sanatcilar: { id: number; ad: string }[];
  promoterlar: PromoterOption[];
  kasalar: KasaOption[];
}

type TabKey = "gelir" | "harcama" | "sanatci";

export function MuzikDetail({
  profil,
  ozet,
  sanatcilar,
  promoterlar,
  kasalar,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("gelir");
  const [view, setView] = useState<"liste" | "aylik">("liste");
  const [gelirOpen, setGelirOpen] = useState(false);
  const [harcamaOpen, setHarcamaOpen] = useState(false);
  const [odemeOpen, setOdemeOpen] = useState(false);
  const [editProfilOpen, setEditProfilOpen] = useState(false);
  const [editingOdeme, setEditingOdeme] = useState<SanatciOdemesiRow | null>(
    null,
  );

  // Platform bazlı gelir kırılımı
  const platformBreakdown = profil.gelirler.reduce<Record<string, number>>(
    (acc, g) => {
      const k = g.platform ?? "Belirsiz";
      acc[k] = (acc[k] ?? 0) + g.tutar;
      return acc;
    },
    {},
  );

  async function handleDelete(
    kind: "gelir" | "harcama" | "sanatci",
    id: number,
  ) {
    if (!confirm("Bu kaydı silmek istediğine emin misin?")) return;
    const fn =
      kind === "gelir"
        ? deleteMuzikGelir
        : kind === "harcama"
          ? deleteMuzikHarcama
          : deleteSanatciOdemesi;
    const r = await fn(id);
    if (r.ok) {
      toast.success("Silindi");
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        <Link
          href="/uygulama/muzik-odemeleri"
          className="inline-flex items-center gap-1 hover:underline"
        >
          <ArrowLeft size={14} /> Müzik Ödemeleri
        </Link>
      </div>

      <PageHeader
        icon={<Music size={20} />}
        title={profil.isim}
        subtitle={`${profil.sanatcilar.map((s) => s.ad).join(", ") || "Sanatçı yok"} · oluşturuldu ${profil.olusturmaTarihi}`}
        actions={
          <Button
            variant="ghost"
            size="md"
            onPress={() => setEditProfilOpen(true)}
          >
            <Pencil size={14} /> Profili Düzenle
          </Button>
        }
      />

      {/* Üst meta — kompakt yatay */}
      <div
        className="rounded-xl border px-4 py-3"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <MetaItem
            label="Sanatçılar"
            content={
              profil.sanatcilar.length === 0 ? (
                <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                  —
                </span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {profil.sanatcilar.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs"
                      style={{
                        background: "var(--surface-muted)",
                        color: "var(--text)",
                      }}
                    >
                      {s.ad}
                    </span>
                  ))}
                </div>
              )
            }
          />
          <MetaItem
            label="İşbirlikçiler"
            content={
              profil.isbirlikciler.length === 0 ? (
                <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                  —
                </span>
              ) : (
                <div
                  className="space-y-0.5 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {profil.isbirlikciler.map((c, i) => (
                    <div key={i}>{c}</div>
                  ))}
                </div>
              )
            }
          />
          <MetaItem
            label="Yayın Mağazaları"
            content={
              profil.magazalar.length === 0 ? (
                <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                  —
                </span>
              ) : (
                <PlatformAvatarStack platforms={profil.magazalar} size={22} />
              )
            }
          />
        </div>
      </div>

      {/* KPI strip */}
      <StatStrip
        items={[
          {
            label: "Gelir",
            value: formatPara(ozet.toplamGelir, "USD"),
            tone: "positive",
          },
          {
            label: "Harcama",
            value: formatPara(ozet.toplamHarcama, "USD"),
            tone: "negative",
          },
          {
            label: "Sanatçıya",
            value: formatPara(ozet.toplamSanatciOdemesi, "USD"),
          },
          {
            label: "Net Kâr",
            value: formatPara(ozet.sirketKar, "USD"),
            tone: ozet.sirketKar >= 0 ? "positive" : "negative",
            emphasized: true,
          },
        ]}
      />

      {/* Platform kırılım — mini bar chart */}
      {Object.keys(platformBreakdown).length > 0 && (() => {
        const entries = Object.entries(platformBreakdown).sort(
          (a, b) => b[1] - a[1],
        );
        const maxVal = Math.max(...entries.map(([, v]) => v));
        return (
          <div
            className="rounded-xl border px-4 py-3"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div
              className="mb-2 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Platform Geliri
            </div>
            <div className="space-y-0.5">
              {entries.map(([k, v]) => (
                <PlatformRevenueRow
                  key={k}
                  platform={k}
                  amount={v}
                  max={maxVal}
                  currency="USD"
                  formatAmount={(a, c) => formatPara(a, c)}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Sekmeler + ana action button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          className="inline-flex rounded-xl border p-1"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <TabBtn
            active={tab === "gelir"}
            onClick={() => setTab("gelir")}
            count={profil.gelirler.length}
            label="Gelir"
          />
          <TabBtn
            active={tab === "harcama"}
            onClick={() => setTab("harcama")}
            count={profil.harcamalar.length}
            label="Harcama"
          />
          <TabBtn
            active={tab === "sanatci"}
            onClick={() => setTab("sanatci")}
            count={profil.sanatciOdemeleri.length}
            label="Sanatçı Ödemesi"
          />
        </div>

        <div className="flex items-center gap-2">
          <ViewToggle
            value={view}
            onChange={(v) => setView(v as "liste" | "aylik")}
            options={[
              { value: "liste", label: "Liste", icon: <List size={12} /> },
              { value: "aylik", label: "Aylık", icon: <CalendarRange size={12} /> },
            ]}
          />
          {tab === "gelir" && (
            <Button variant="primary" size="md" onPress={() => setGelirOpen(true)}>
              <Plus size={14} /> Gelir Ekle
            </Button>
          )}
          {tab === "harcama" && (
            <Button
              variant="primary"
              size="md"
              onPress={() => setHarcamaOpen(true)}
            >
              <Plus size={14} /> Harcama Ekle
            </Button>
          )}
          {tab === "sanatci" && (
            <Button
              variant="primary"
              size="md"
              onPress={() => {
                setEditingOdeme(null);
                setOdemeOpen(true);
              }}
            >
              <Plus size={14} /> Sanatçı Ödemesi
            </Button>
          )}
        </div>
      </div>

      {tab === "gelir" && (
        <GelirTable
          profil={profil}
          view={view}
          onAdd={() => setGelirOpen(true)}
          onDelete={(id) => handleDelete("gelir", id)}
        />
      )}
      {tab === "harcama" && (
        <HarcamaTable
          profil={profil}
          view={view}
          onAdd={() => setHarcamaOpen(true)}
          onDelete={(id) => handleDelete("harcama", id)}
        />
      )}
      {tab === "sanatci" && (
        <SanatciTable
          profil={profil}
          view={view}
          onAdd={() => {
            setEditingOdeme(null);
            setOdemeOpen(true);
          }}
          onEdit={(row) => {
            setEditingOdeme(row);
            setOdemeOpen(true);
          }}
          onDelete={(id) => handleDelete("sanatci", id)}
        />
      )}

      <GelirDialog
        open={gelirOpen}
        onClose={() => setGelirOpen(false)}
        muzikProfilId={profil.id}
        muzikIsim={profil.isim}
        bagliMagazalar={profil.magazalar}
      />
      <HarcamaDialog
        open={harcamaOpen}
        onClose={() => setHarcamaOpen(false)}
        muzikProfilId={profil.id}
        muzikIsim={profil.isim}
        promoterlar={promoterlar}
        kasalar={kasalar}
      />
      <SanatciOdemesiDialog
        open={odemeOpen}
        onClose={() => {
          setOdemeOpen(false);
          setEditingOdeme(null);
        }}
        muzikProfilId={profil.id}
        muzikIsim={profil.isim}
        sanatcilar={
          profil.sanatcilar.length > 0
            ? profil.sanatcilar
            : sanatcilar
        }
        kasalar={kasalar}
        editing={editingOdeme}
      />
      <MuzikProfilEditDialog
        open={editProfilOpen}
        onClose={() => setEditProfilOpen(false)}
        profil={{
          id: profil.id,
          isim: profil.isim,
          isbirlikciler: profil.isbirlikciler,
          magazalar: profil.magazalar,
          notlar: profil.notlar,
          sanatcilar: profil.sanatcilar,
        }}
        tumSanatcilar={sanatcilar}
      />
    </div>
  );
}

/* ─────────── alt bileşenler ─────────── */

function MetaItem({
  label,
  content,
}: {
  label: string;
  content: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="mb-1 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </div>
      {content}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  count,
  label,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
      style={{
        background: active ? "var(--brand-soft)" : "transparent",
        color: active ? "var(--brand)" : "var(--text-muted)",
      }}
    >
      {label}
      <span
        className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold"
        style={{
          background: active
            ? "color-mix(in oklch, var(--brand) 20%, transparent)"
            : "var(--surface-muted)",
          color: active ? "var(--brand)" : "var(--text-soft)",
        }}
      >
        {count}
      </span>
    </button>
  );
}

function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function BorclarBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        background: "var(--warning-soft)",
        color: "var(--warning)",
      }}
      title="Bu harcama Borçlar tablosuna da düştü"
    >
      <Link2 size={9} /> Borçlar&apos;da
    </span>
  );
}

function GelirTable({
  profil,
  view,
  onAdd,
  onDelete,
}: {
  profil: MuzikDetailProfil;
  view: "liste" | "aylik";
  onAdd: () => void;
  onDelete: (id: number) => void;
}) {
  if (profil.gelirler.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp size={24} />}
        title="Henüz gelir kaydı yok"
        description="Mağaza payout'larını veya tek seferlik gelirleri buraya ekle."
        action={
          <Button variant="primary" size="md" onPress={onAdd}>
            <Plus size={14} /> İlk gelir kaydını ekle
          </Button>
        }
        compact
      />
    );
  }
  if (view === "aylik") {
    return (
      <MonthAccordion
        items={profil.gelirler}
        getDate={(g) => g.tarih}
        getAmount={(g) => g.tutar}
        getCurrency={(g) => g.paraBirimi}
        tone="positive"
        defaultOpenCount={1}
        renderGroup={(grp) => (
          <ul>
            {grp.items.map((g, i) => (
              <li
                key={g.id}
                className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[color-mix(in_oklch,var(--accent)_5%,transparent)]"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
              >
                <div className="flex w-32 shrink-0 items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  <Calendar size={11} />
                  {g.tarih}
                </div>
                <div className="flex w-40 shrink-0 items-center gap-1.5 text-xs">
                  {g.platform ? (
                    <>
                      <PlatformIcon platform={g.platform} size={14} />
                      <span>{platformDisplayName(g.platform)}</span>
                    </>
                  ) : (
                    <span style={{ color: "var(--text-soft)" }}>—</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 truncate text-xs" style={{ color: "var(--text-muted)" }}>
                  {g.not ?? ""}
                </div>
                <div
                  className="shrink-0 text-right font-semibold tabular-nums"
                  style={{ color: "var(--positive)" }}
                >
                  +{formatPara(g.tutar, g.paraBirimi)}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(g.id)}
                  aria-label="Sil"
                  className="shrink-0 rounded-md p-1.5 opacity-0 transition-opacity hover:bg-black/5 group-hover:opacity-100 dark:hover:bg-white/5"
                  style={{ color: "var(--negative)" }}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      />
    );
  }
  return (
    <TableShell>
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
            <th className="px-4 py-2.5">Tarih</th>
            <th className="px-4 py-2.5">Platform</th>
            <th className="px-4 py-2.5 text-right">Tutar</th>
            <th className="px-4 py-2.5">Not</th>
            <th className="px-4 py-2.5 text-right">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {profil.gelirler.map((g) => (
            <tr
              key={g.id}
              className="border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <td className="px-4 py-2.5 whitespace-nowrap">
                <span
                  className="inline-flex items-center gap-1.5 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Calendar size={11} />
                  {g.tarih}
                </span>
              </td>
              <td className="px-4 py-2.5">
                {g.platform ? (
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <PlatformIcon platform={g.platform} size={14} />
                    <span>{platformDisplayName(g.platform)}</span>
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                    —
                  </span>
                )}
              </td>
              <td
                className="px-4 py-2.5 text-right font-semibold tabular-nums"
                style={{ color: "var(--positive)" }}
              >
                +{formatPara(g.tutar, g.paraBirimi)}
              </td>
              <td
                className="px-4 py-2.5 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {g.not ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-right">
                <button
                  type="button"
                  className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: "var(--negative)" }}
                  onClick={() => onDelete(g.id)}
                  aria-label="Sil"
                >
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function HarcamaTable({
  profil,
  view,
  onAdd,
  onDelete,
}: {
  profil: MuzikDetailProfil;
  view: "liste" | "aylik";
  onAdd: () => void;
  onDelete: (id: number) => void;
}) {
  if (profil.harcamalar.length === 0) {
    return (
      <EmptyState
        icon={<TrendingDown size={24} />}
        title="Henüz harcama kaydı yok"
        description="Reklam, tasarım, prodüksiyon gibi harcamalar buradan eklenir — eklendiğinde Borçlar'a otomatik düşer."
        action={
          <Button variant="primary" size="md" onPress={onAdd}>
            <Plus size={14} /> İlk harcamayı ekle
          </Button>
        }
        compact
      />
    );
  }
  if (view === "aylik") {
    return (
      <MonthAccordion
        items={profil.harcamalar}
        getDate={(h) => h.tarih}
        getAmount={(h) => h.tutar}
        getCurrency={(h) => h.paraBirimi}
        tone="negative"
        defaultOpenCount={1}
        renderGroup={(grp) => (
          <ul>
            {grp.items.map((h, i) => (
              <li
                key={h.id}
                className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[color-mix(in_oklch,var(--accent)_5%,transparent)]"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
              >
                <div className="flex w-32 shrink-0 items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  <Calendar size={11} />
                  {h.tarih}
                </div>
                <div className="flex w-40 shrink-0 text-xs">
                  {h.kategori ? (
                    <span>{muzikHarcamaKategoriEtiket[h.kategori as MuzikHarcamaKategori]}</span>
                  ) : (
                    <span style={{ color: "var(--text-soft)" }}>—</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 truncate text-xs" style={{ color: "var(--text-muted)" }}>
                  {h.promoter ? `${h.promoter.ad} · ` : ""}
                  {h.not ?? ""}
                </div>
                {h.borclaraYansit && (
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
                    title="Borçlar'a düştü"
                  >
                    <Link2 size={10} className="inline" /> Borç
                  </span>
                )}
                <div
                  className="shrink-0 text-right font-semibold tabular-nums"
                  style={{ color: "var(--negative)" }}
                >
                  −{formatPara(h.tutar, h.paraBirimi)}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(h.id)}
                  aria-label="Sil"
                  className="shrink-0 rounded-md p-1.5 opacity-0 transition-opacity hover:bg-black/5 group-hover:opacity-100 dark:hover:bg-white/5"
                  style={{ color: "var(--negative)" }}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      />
    );
  }
  return (
    <TableShell>
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
            <th className="px-4 py-2.5">Tarih</th>
            <th className="px-4 py-2.5">Kategori</th>
            <th className="px-4 py-2.5 text-right">Tutar</th>
            <th className="px-4 py-2.5">Promoter</th>
            <th className="px-4 py-2.5">Kasa</th>
            <th className="px-4 py-2.5">Not</th>
            <th className="px-4 py-2.5 text-right">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {profil.harcamalar.map((h) => (
            <tr
              key={h.id}
              className="border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <td className="px-4 py-2.5 whitespace-nowrap">
                <span
                  className="inline-flex items-center gap-1.5 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Calendar size={11} />
                  {h.tarih}
                </span>
              </td>
              <td className="px-4 py-2.5">
                {h.kategori ? (
                  <span
                    className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs"
                    style={{
                      background: "var(--surface-muted)",
                      color: "var(--text)",
                    }}
                  >
                    {muzikHarcamaKategoriEtiket[h.kategori]}
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                    —
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span
                    className="font-semibold tabular-nums"
                    style={{ color: "var(--negative)" }}
                  >
                    −{formatPara(h.tutar, h.paraBirimi)}
                  </span>
                  {h.borclaraYansit && <BorclarBadge />}
                </div>
              </td>
              <td className="px-4 py-2.5">
                {h.promoter ? (
                  <Link
                    href="/uygulama/profiller?harcamaTuru=Promoter"
                    className="inline-flex items-center gap-1 text-xs hover:underline"
                    style={{ color: "var(--brand)" }}
                  >
                    {h.promoter.ad}
                    <ExternalLink size={10} />
                  </Link>
                ) : (
                  <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                    —
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5">
                {h.kasa ? (
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h.kasa.ad}
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: "var(--text-soft)" }}>
                    —
                  </span>
                )}
              </td>
              <td
                className="px-4 py-2.5 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {h.not ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-right">
                <button
                  type="button"
                  className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: "var(--negative)" }}
                  onClick={() => onDelete(h.id)}
                  aria-label="Sil"
                >
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function SanatciTable({
  profil,
  view,
  onAdd,
  onEdit,
  onDelete,
}: {
  profil: MuzikDetailProfil;
  view: "liste" | "aylik";
  onAdd: () => void;
  onEdit: (row: SanatciOdemesiRow) => void;
  onDelete: (id: number) => void;
}) {
  if (profil.sanatciOdemeleri.length === 0) {
    return (
      <EmptyState
        icon={<Users size={24} />}
        title="Henüz sanatçı ödemesi yok"
        description="Bu müzik için sanatçılara yapılan ödemeleri buradan ekle. Her ödeme şirket net kârından düşer."
        action={
          <Button variant="primary" size="md" onPress={onAdd}>
            <Plus size={14} /> İlk ödemeyi ekle
          </Button>
        }
        compact
      />
    );
  }
  if (view === "aylik") {
    return (
      <MonthAccordion
        items={profil.sanatciOdemeleri}
        getDate={(o) => o.tarih}
        getAmount={(o) => o.tutar}
        getCurrency={(o) => o.paraBirimi}
        tone="neutral"
        defaultOpenCount={1}
        renderGroup={(grp) => (
          <ul>
            {grp.items.map((o, i) => (
              <li
                key={o.id}
                onClick={() => onEdit(o)}
                className="group flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[color-mix(in_oklch,var(--accent)_5%,transparent)]"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
              >
                <div className="flex w-32 shrink-0 items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  <Calendar size={11} />
                  {o.tarih}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{o.sanatci.ad}</div>
                  {o.not && (
                    <div
                      className="mt-0.5 truncate text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {o.not}
                    </div>
                  )}
                </div>
                {o.borclaraYansit && (
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
                    title="Borçlar'a düştü"
                  >
                    <Link2 size={10} className="inline" /> Borç
                  </span>
                )}
                <div
                  className="shrink-0 text-right font-semibold tabular-nums"
                  style={{ color: "var(--text)" }}
                >
                  {formatPara(o.tutar, o.paraBirimi)}
                </div>
                <div
                  className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onEdit(o)}
                    aria-label="Düzenle"
                    className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(o.id)}
                    aria-label="Sil"
                    className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: "var(--negative)" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      />
    );
  }
  return (
    <TableShell>
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
            <th className="px-4 py-2.5">Tarih</th>
            <th className="px-4 py-2.5">Sanatçı</th>
            <th className="px-4 py-2.5 text-right">Tutar</th>
            <th className="px-4 py-2.5">Not</th>
            <th className="px-4 py-2.5 text-right">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {profil.sanatciOdemeleri.map((o) => (
            <tr
              key={o.id}
              className="border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <td className="px-4 py-2.5 whitespace-nowrap">
                <span
                  className="inline-flex items-center gap-1.5 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Calendar size={11} />
                  {o.tarih}
                </span>
              </td>
              <td className="px-4 py-2.5 font-medium">{o.sanatci.ad}</td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span
                    className="font-semibold tabular-nums"
                    style={{ color: "var(--text)" }}
                  >
                    {formatPara(o.tutar, o.paraBirimi)}
                  </span>
                  {o.borclaraYansit && <BorclarBadge />}
                </div>
              </td>
              <td
                className="px-4 py-2.5 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {o.not ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-right">
                <button
                  type="button"
                  className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => onEdit(o)}
                  aria-label="Düzenle"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: "var(--negative)" }}
                  onClick={() => onDelete(o.id)}
                  aria-label="Sil"
                >
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

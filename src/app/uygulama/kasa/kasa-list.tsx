"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@heroui/react";
import {
  Plus,
  Wallet,
  Pencil,
  Trash2,
  Star,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { KasaDialog } from "./kasa-dialog";
import { HareketDialog } from "./hareket-dialog";
import { deleteKasa, setVarsayilanKasa } from "./actions";
import { formatPara } from "@/lib/format";

export interface KasaRow {
  id: number;
  ad: string;
  paraBirimi: string;
  acilis: string;
  aktif: boolean;
  varsayilan: boolean;
  aciklama: string | null;
  toplamGiris: string;
  toplamCikis: string;
  bakiye: string;
}

interface Props {
  items: KasaRow[];
}

export function KasaList({ items }: Props) {
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KasaRow | null>(null);
  const [hareketKasa, setHareketKasa] = useState<KasaRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KasaRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [varsayilanLoading, setVarsayilanLoading] = useState<number | null>(
    null,
  );
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  function openYeni() {
    setEditing(null);
    setDialogOpen(true);
  }

  // Para birimine göre toplam bakiyeler
  const paraBazli = useMemo(() => {
    const map = new Map<string, number>();
    for (const k of items) {
      if (!k.aktif) continue;
      const v = map.get(k.paraBirimi) ?? 0;
      map.set(k.paraBirimi, v + parseFloat(k.bakiye));
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await deleteKasa(deleteTarget.id);
    setDeleting(false);
    if (r.ok) {
      toast.success(`${deleteTarget.ad} silindi`);
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  async function onSetVarsayilan(k: KasaRow) {
    setMenuOpenId(null);
    setVarsayilanLoading(k.id);
    const r = await setVarsayilanKasa(k.id);
    setVarsayilanLoading(null);
    if (r.ok) {
      toast.success(`${k.ad} varsayılan kasa yapıldı`);
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  // Kasalar (varsayılan ilk + aktif + pasif sırasıyla zaten sıralanmış)
  const aktifKasalar = items.filter((k) => k.aktif);

  return (
    <>
      <PageHeader
        icon={<Wallet size={20} />}
        title="Kasa Yönetimi"
        subtitle="TL/USD/EUR kasalarınız, transferler ve günlük bakiyeler"
        actions={
          <Button variant="primary" size="md" onPress={openYeni}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Yeni Kasa
            </span>
          </Button>
        }
      />

      {paraBazli.length > 0 && (
        <div
          className="mb-4 grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${Math.min(paraBazli.length, 4)}, minmax(0, 1fr))`,
          }}
        >
          {paraBazli.map(([pb, toplam]) => (
            <StatCard
              key={pb}
              label={`Toplam Bakiye (${pb})`}
              value={formatPara(toplam, pb)}
              hint="aktif kasalardan"
              tone={toplam >= 0 ? "positive" : "negative"}
              icon={<Coins size={18} />}
            />
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<Wallet size={22} />}
          title="Henüz kasa yok"
          description="TL, USD, EUR gibi her para birimi için ayrı bir kasa oluşturabilirsiniz."
          action={
            <Button variant="primary" size="md" onPress={openYeni}>
              <span className="flex items-center gap-1.5">
                <Plus size={16} /> Yeni Kasa
              </span>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((k) => {
            const bakiye = parseFloat(k.bakiye);
            const isPositive = bakiye >= 0;
            const isMenuOpen = menuOpenId === k.id;
            return (
              <div
                key={k.id}
                className="group relative overflow-hidden rounded-2xl border transition-shadow"
                style={{
                  background: "var(--surface)",
                  borderColor: k.varsayilan
                    ? "color-mix(in oklch, var(--accent) 35%, transparent)"
                    : "var(--border)",
                  boxShadow: "var(--shadow-soft)",
                  opacity: k.aktif ? 1 : 0.55,
                }}
              >
                {k.varsayilan && (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ background: "var(--accent)" }}
                  />
                )}

                <Link
                  href={`/uygulama/kasa/${k.id}`}
                  className="block p-5"
                  aria-label={`${k.ad} detayları`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold">
                          {k.ad}
                        </h3>
                        {k.varsayilan && (
                          <span
                            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{
                              background: "var(--brand-soft)",
                              color: "var(--accent)",
                            }}
                          >
                            <Star size={10} fill="currentColor" /> Varsayılan
                          </span>
                        )}
                        {!k.aktif && (
                          <span
                            className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              background: "var(--surface-muted)",
                              color: "var(--text-muted)",
                            }}
                          >
                            Pasif
                          </span>
                        )}
                      </div>
                      <div
                        className="mt-1 text-xs"
                        style={{ color: "var(--text-soft)" }}
                      >
                        {k.aciklama || "—"}
                      </div>
                    </div>

                    <span
                      className="shrink-0 rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold"
                      style={{
                        borderColor: "var(--border-strong)",
                        color: "var(--text-muted)",
                        background: "var(--surface-muted)",
                      }}
                    >
                      {k.paraBirimi}
                    </span>
                  </div>

                  <div className="mt-2">
                    <div
                      className="text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Mevcut Bakiye
                    </div>
                    <div
                      className="mt-1 text-3xl font-bold tabular-nums"
                      style={{
                        color: isPositive
                          ? "var(--positive)"
                          : "var(--negative)",
                      }}
                    >
                      {formatPara(bakiye, k.paraBirimi)}
                    </div>
                  </div>

                  <div
                    className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-xs"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div>
                      <div
                        className="flex items-center gap-1"
                        style={{ color: "var(--text-soft)" }}
                      >
                        <ArrowDownLeft size={11} /> Giriş
                      </div>
                      <div
                        className="mt-0.5 font-semibold tabular-nums"
                        style={{ color: "var(--positive)" }}
                      >
                        {formatPara(parseFloat(k.toplamGiris), k.paraBirimi)}
                      </div>
                    </div>
                    <div>
                      <div
                        className="flex items-center gap-1"
                        style={{ color: "var(--text-soft)" }}
                      >
                        <ArrowUpRight size={11} /> Çıkış
                      </div>
                      <div
                        className="mt-0.5 font-semibold tabular-nums"
                        style={{ color: "var(--negative)" }}
                      >
                        {formatPara(parseFloat(k.toplamCikis), k.paraBirimi)}
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Kart aksiyonları */}
                <div
                  className="flex items-center justify-between border-t px-3 py-2"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface-muted)",
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setHareketKasa(k);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    style={{ color: "var(--accent)" }}
                  >
                    <ArrowLeftRight size={12} /> Hareket Ekle
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      aria-label="Diğer aksiyonlar"
                      onClick={(e) => {
                        e.preventDefault();
                        setMenuOpenId(isMenuOpen ? null : k.id);
                      }}
                      className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <MoreVertical size={14} />
                    </button>
                    {isMenuOpen && (
                      <>
                        <button
                          type="button"
                          aria-label="Menüyü kapat"
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpenId(null)}
                        />
                        <div
                          className="absolute right-0 bottom-full z-20 mb-1 min-w-[180px] overflow-hidden rounded-lg border shadow-lg"
                          style={{
                            background: "var(--surface)",
                            borderColor: "var(--border)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenId(null);
                              setEditing(k);
                              setDialogOpen(true);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                          >
                            <Pencil size={12} /> Düzenle
                          </button>
                          {!k.varsayilan && k.aktif && (
                            <button
                              type="button"
                              onClick={() => onSetVarsayilan(k)}
                              disabled={varsayilanLoading === k.id}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
                            >
                              <Star size={12} />{" "}
                              {varsayilanLoading === k.id
                                ? "Ayarlanıyor…"
                                : "Varsayılan Yap"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenId(null);
                              setDeleteTarget(k);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                            style={{ color: "var(--negative)" }}
                          >
                            <Trash2 size={12} /> Sil
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <KasaDialog
        isOpen={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          router.refresh();
        }}
      />

      <HareketDialog
        kasalar={aktifKasalar.map((k) => ({
          id: k.id,
          ad: k.ad,
          paraBirimi: k.paraBirimi,
        }))}
        defaultKasaId={hareketKasa?.id ?? null}
        onClose={() => setHareketKasa(null)}
        onSaved={() => {
          setHareketKasa(null);
          router.refresh();
        }}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={`"${deleteTarget?.ad}" silinsin mi?`}
        description="Bu işlem geri alınamaz. Kasanın tüm hareketleri de silinir."
        confirmText="Sil"
        variant="danger"
        isLoading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}

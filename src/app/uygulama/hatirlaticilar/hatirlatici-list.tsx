"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@heroui/react";
import {
  Plus,
  Pencil,
  Trash2,
  Bell,
  Check,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HatirlaticiDialog } from "./hatirlatici-dialog";
import {
  toggleHatirlaticiTamamla,
  deleteHatirlatici,
} from "./actions";
import {
  HatirlaticiOncelik,
  hatirlaticiOncelikEtiket,
} from "@/lib/enums";
import { formatTarihUzun, formatVade } from "@/lib/format";

export interface HatirlaticiRow {
  id: number;
  baslik: string;
  aciklama: string | null;
  hatirlatmaTarihi: string;
  tamamlandi: boolean;
  oncelik: string;
  cari: { id: number; kod: string; unvan: string } | null;
}

export interface CariRef {
  id: number;
  kod: string;
  unvan: string;
}

interface Props {
  currentTab: string;
  items: HatirlaticiRow[];
  cariler: CariRef[];
  sayilar: { acik: number; tamamlandi: number };
}

export function HatirlaticiList({
  currentTab,
  items,
  cariler,
  sayilar,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingToggle, startToggle] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HatirlaticiRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HatirlaticiRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openYeni() {
    setEditing(null);
    setDialogOpen(true);
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await deleteHatirlatici(deleteTarget.id);
    setDeleting(false);
    if (r.ok) {
      toast.success("Hatırlatıcı silindi");
      setDeleteTarget(null);
      router.refresh();
    } else toast.error(r.error);
  }

  async function onToggle(h: HatirlaticiRow) {
    startToggle(async () => {
      const r = await toggleHatirlaticiTamamla(h.id, !h.tamamlandi);
      if (r.ok) {
        toast.success(h.tamamlandi ? "Tekrar açıldı" : "Tamamlandı");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <>
      <PageHeader
        icon={<Bell size={20} />}
        title="Hatırlatıcılar"
        subtitle="Görev ve hatırlatma listeniz — vadesi yakın olanları görün"
        actions={
          <Button variant="primary" size="md" onPress={openYeni}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Yeni Hatırlatıcı
            </span>
          </Button>
        }
      />

      {/* Tabs */}
      <div
        className="mb-4 flex gap-1 rounded-lg border p-1"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          width: "fit-content",
        }}
      >
        <TabLink
          href={`${pathname}?tab=acik`}
          active={currentTab === "acik"}
          label="Açık"
          count={sayilar.acik}
        />
        <TabLink
          href={`${pathname}?tab=tamamlandi`}
          active={currentTab === "tamamlandi"}
          label="Tamamlandı"
          count={sayilar.tamamlandi}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Bell size={22} />}
          title={
            currentTab === "tamamlandi"
              ? "Tamamlanmış hatırlatıcı yok"
              : "Açık hatırlatıcı yok"
          }
          description={
            currentTab === "tamamlandi"
              ? "Hatırlatıcıları tamamladıkça burada görünür"
              : "Yeni bir hatırlatıcı ekleyin"
          }
          action={
            currentTab !== "tamamlandi" ? (
              <Button variant="primary" size="md" onPress={openYeni}>
                <span className="flex items-center gap-1.5">
                  <Plus size={16} /> Yeni Hatırlatıcı
                </span>
              </Button>
            ) : null
          }
        />
      ) : (
        <div
          className="overflow-hidden rounded-xl border"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <ul>
            {items.map((h, i) => {
              const vade = formatVade(h.hatirlatmaTarihi);
              const yuksek = h.oncelik === HatirlaticiOncelik.Yuksek;
              return (
                <li
                  key={h.id}
                  className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                  style={{
                    borderTop:
                      i === 0 ? "none" : "1px solid var(--border)",
                  }}
                >
                  <button
                    onClick={() => onToggle(h)}
                    disabled={pendingToggle}
                    aria-label={
                      h.tamamlandi ? "Tekrar aç" : "Tamamlandı olarak işaretle"
                    }
                    className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors"
                    style={{
                      borderColor: h.tamamlandi
                        ? "var(--positive)"
                        : "var(--border-strong)",
                      background: h.tamamlandi
                        ? "var(--positive)"
                        : "transparent",
                    }}
                  >
                    {h.tamamlandi && (
                      <Check size={12} className="text-white" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-medium"
                        style={{
                          color: h.tamamlandi
                            ? "var(--text-muted)"
                            : "var(--text)",
                          textDecoration: h.tamamlandi
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {h.baslik}
                      </span>
                      {yuksek && !h.tamamlandi && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                          style={{
                            background: "var(--negative-soft)",
                            color: "var(--negative)",
                          }}
                        >
                          <AlertTriangle size={10} />
                          Yüksek
                        </span>
                      )}
                    </div>
                    {h.aciklama && (
                      <div
                        className="mt-0.5 text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {h.aciklama}
                      </div>
                    )}
                    <div
                      className="mt-1 flex items-center gap-2 text-xs"
                      style={{ color: "var(--text-soft)" }}
                    >
                      <span>{formatTarihUzun(h.hatirlatmaTarihi)}</span>
                      {!h.tamamlandi && (
                        <>
                          <span>·</span>
                          <span
                            style={{
                              color:
                                vade.durum === "gecikti"
                                  ? "var(--negative)"
                                  : vade.durum === "bugun"
                                  ? "var(--warning)"
                                  : "var(--text-soft)",
                              fontWeight:
                                vade.durum === "gecikti" || vade.durum === "bugun"
                                  ? 500
                                  : 400,
                            }}
                          >
                            {vade.metin}
                          </span>
                        </>
                      )}
                      {h.cari && (
                        <>
                          <span>·</span>
                          <span>{h.cari.unvan}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => {
                        setEditing(h);
                        setDialogOpen(true);
                      }}
                      className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                      style={{ color: "var(--text-muted)" }}
                      aria-label="Düzenle"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(h)}
                      className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                      style={{ color: "var(--negative)" }}
                      aria-label="Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <HatirlaticiDialog
        isOpen={dialogOpen}
        editing={editing}
        cariler={cariler}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={`"${deleteTarget?.baslik}" silinsin mi?`}
        confirmText="Sil"
        variant="danger"
        isLoading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}

function TabLink({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors"
      style={{
        background: active ? "var(--surface-muted)" : "transparent",
        color: active ? "var(--text)" : "var(--text-muted)",
        fontWeight: active ? 500 : 400,
      }}
    >
      {label}
      <span
        className="rounded px-1.5 py-0.5 text-[10px]"
        style={{
          background: active ? "var(--surface)" : "var(--surface-muted)",
          color: "var(--text-muted)",
        }}
      >
        {count}
      </span>
    </Link>
  );
}

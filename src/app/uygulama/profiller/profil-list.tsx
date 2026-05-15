"use client";

import { useState, useTransition, useDeferredValue, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@heroui/react";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Search,
  Phone,
  Mail,
  Tag as TagIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, TextInput } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProfilDialog } from "./profil-dialog";
import { deleteProfil } from "./actions";
import {
  CariTipi,
  cariTipiEtiket,
  tagColorClass,
  type TagColor,
} from "@/lib/enums";

export interface TagRef {
  id: number;
  ad: string;
  renk: string;
}

export interface ProfilRow {
  id: number;
  kod: string;
  unvan: string;
  tip: string;
  telefon: string | null;
  email: string | null;
  sehir: string | null;
  vergiNo: string | null;
  tcKimlikNo: string | null;
  vergiDairesi: string | null;
  adres: string | null;
  acilisBakiyesi: string;
  notlar: string | null;
  aktif: boolean;
  etiketler: TagRef[];
}

interface Props {
  profiller: ProfilRow[];
  sonrakiKod: string;
  tumEtiketler: TagRef[];
  icon?: React.ReactNode;
}

export function ProfilList({ profiller, sonrakiKod, tumEtiketler }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [localQ, setLocalQ] = useState(params.get("q") ?? "");
  const deferredQ = useDeferredValue(localQ);
  const tip = params.get("tip") ?? "";
  const etiket = params.get("etiket") ?? "";

  // URL ile senkron — yazınca arama refleksif olarak yapılır
  useEffect(() => {
    const url = new URLSearchParams(params.toString());
    if (deferredQ) url.set("q", deferredQ);
    else url.delete("q");
    startTransition(() => {
      router.replace(`/uygulama/profiller?${url.toString()}`, { scroll: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQ]);

  function setParam(key: string, value: string) {
    const url = new URLSearchParams(params.toString());
    if (value) url.set(key, value);
    else url.delete(key);
    startTransition(() => {
      router.replace(`/uygulama/profiller?${url.toString()}`, { scroll: false });
    });
  }

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfil, setEditingProfil] = useState<ProfilRow | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ProfilRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openYeni() {
    setEditingProfil(null);
    setDialogOpen(true);
  }

  function openDuzenle(p: ProfilRow) {
    setEditingProfil(p);
    setDialogOpen(true);
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteProfil(deleteTarget.id);
    setDeleting(false);
    if (result.ok) {
      toast.success(`${deleteTarget.unvan} silindi`);
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <PageHeader
        icon={<Users size={20} />}
        title="Profiller"
        subtitle="Müşteri ve tedarikçi kayıtları — isim, telefon veya e-posta ile arayın"
        actions={
          <Button variant="primary" size="md" onPress={openYeni}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Yeni Profil
            </span>
          </Button>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute top-3 left-3"
            style={{ color: "var(--text-soft)" }}
          />
          <TextInput
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder="Ünvan, kod, telefon, e-posta..."
            className="pl-9"
          />
        </div>
        <Select value={tip} onChange={(e) => setParam("tip", e.target.value)}>
          <option value="">Tüm Tipler</option>
          <option value={CariTipi.Musteri}>{cariTipiEtiket.Musteri}</option>
          <option value={CariTipi.Tedarikci}>{cariTipiEtiket.Tedarikci}</option>
          <option value={CariTipi.HerIkisi}>{cariTipiEtiket.HerIkisi}</option>
        </Select>
        <Select
          value={etiket}
          onChange={(e) => setParam("etiket", e.target.value)}
        >
          <option value="">Tüm Etiketler</option>
          {tumEtiketler.map((t) => (
            <option key={t.id} value={t.id}>
              {t.ad}
            </option>
          ))}
        </Select>
      </div>

      {profiller.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title={localQ || tip ? "Eşleşen profil yok" : "Henüz profil yok"}
          description={
            localQ || tip
              ? "Aramayı temizleyin veya farklı bir filtreyle deneyin."
              : "İlk profilinizi ekleyerek başlayın. Müşteri veya tedarikçi olabilir."
          }
          action={
            <Button variant="primary" size="md" onPress={openYeni}>
              <span className="flex items-center gap-1.5">
                <Plus size={16} /> Yeni Profil
              </span>
            </Button>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead
                className="text-left"
                style={{
                  background: "var(--surface-muted)",
                  color: "var(--text-muted)",
                }}
              >
                <tr>
                  <th className="px-4 py-3 font-medium">Kod</th>
                  <th className="px-4 py-3 font-medium">Ünvan</th>
                  <th className="px-4 py-3 font-medium">Tip</th>
                  <th className="px-4 py-3 font-medium">İletişim</th>
                  <th className="px-4 py-3 font-medium">Şehir</th>
                  <th className="px-4 py-3 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {profiller.map((p, i) => (
                  <tr
                    key={p.id}
                    className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                    style={{
                      borderTop:
                        i === 0 ? "none" : "1px solid var(--border)",
                    }}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {p.kod}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.unvan}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {!p.aktif && (
                          <span
                            className="inline-block rounded px-1.5 py-0.5 text-[10px] uppercase"
                            style={{
                              background: "var(--surface-muted)",
                              color: "var(--text-soft)",
                            }}
                          >
                            Pasif
                          </span>
                        )}
                        {p.etiketler.map((t) => {
                          const c =
                            tagColorClass[t.renk as TagColor] ??
                            tagColorClass.gray;
                          return (
                            <span
                              key={t.id}
                              className="inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                background: c.bg,
                                color: c.text,
                                borderColor: c.border,
                              }}
                            >
                              <TagIcon size={9} />
                              {t.ad}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-xs"
                        style={{
                          background: tipBg(p.tip),
                          color: tipColor(p.tip),
                        }}
                      >
                        {cariTipiEtiket[p.tip as keyof typeof cariTipiEtiket] ?? p.tip}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
                      <div className="space-y-0.5 text-xs">
                        {p.telefon && (
                          <div className="flex items-center gap-1">
                            <Phone size={11} /> {p.telefon}
                          </div>
                        )}
                        {p.email && (
                          <div className="flex items-center gap-1">
                            <Mail size={11} /> {p.email}
                          </div>
                        )}
                        {!p.telefon && !p.email && (
                          <span style={{ color: "var(--text-soft)" }}>—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      {p.sehir ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openDuzenle(p)}
                          className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                          aria-label="Düzenle"
                          style={{ color: "var(--text-muted)" }}
                          title="Düzenle"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                          aria-label="Sil"
                          style={{ color: "var(--negative)" }}
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className="border-t px-4 py-2.5 text-xs"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-muted)",
              background: "var(--surface-muted)",
            }}
          >
            Toplam {profiller.length} profil
            {pending && " · güncelleniyor…"}
          </div>
        </div>
      )}

      <ProfilDialog
        isOpen={dialogOpen}
        profil={editingProfil}
        sonrakiKod={sonrakiKod}
        tumEtiketler={tumEtiketler}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={`"${deleteTarget?.unvan}" silinsin mi?`}
        description="Bu işlem geri alınamaz. Bu profile bağlı tüm alacak/borç ve hareket kayıtları da silinecek."
        confirmText="Sil"
        variant="danger"
        isLoading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}

function tipBg(tip: string): string {
  switch (tip) {
    case CariTipi.Musteri:
      return "var(--positive-soft)";
    case CariTipi.Tedarikci:
      return "var(--brand-soft)";
    default:
      return "var(--surface-muted)";
  }
}

function tipColor(tip: string): string {
  switch (tip) {
    case CariTipi.Musteri:
      return "var(--positive)";
    case CariTipi.Tedarikci:
      return "var(--brand)";
    default:
      return "var(--text-muted)";
  }
}

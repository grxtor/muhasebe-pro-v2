"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import {
  BarChart3,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Pencil,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { DataModal } from "@/components/ui/data-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Field,
  Label,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui/form-field";
import { formatPara, formatTarih } from "@/lib/format";
import {
  createTicaretKayit,
  deleteTicaretKayit,
  updateTicaretGetiri,
} from "./actions";

export interface CariRef {
  id: number;
  kod: string;
  unvan: string;
}

export interface TicaretRow {
  id: number;
  cariId: number;
  baslik: string;
  aciklama: string | null;
  paraBirimi: string;
  yatirim: number;
  getiri: number;
  kar: number;
  karYuzdesi: number;
  olusturmaTarihi: string;
  cari: { id: number; kod: string; unvan: string };
}

interface Ozet {
  toplamYatirim: number;
  toplamGetiri: number;
  netKar: number;
  ortalamaKarYuzdesi: number;
  kayitSayisi: number;
}

interface Props {
  items: TicaretRow[];
  cariler: CariRef[];
  ozet: Ozet;
}

export function TicaretList({ items, cariler, ozet }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TicaretRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TicaretRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const chartData = useMemo(
    () =>
      items
        .slice(0, 30)
        .map((r) => ({
          ad:
            r.baslik.length > 14 ? `${r.baslik.slice(0, 12)}…` : r.baslik,
          yatirim: r.yatirim,
          getiri: r.getiri,
        }))
        .reverse(),
    [items],
  );

  const netKarTone =
    ozet.netKar === 0 ? "neutral" : ozet.netKar > 0 ? "positive" : "negative";
  const ortYuzdeTone =
    ozet.ortalamaKarYuzdesi === 0
      ? "neutral"
      : ozet.ortalamaKarYuzdesi > 0
        ? "positive"
        : "negative";

  async function onDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await deleteTicaretKayit(deleteTarget.id);
    setDeleting(false);
    if (r.ok) {
      toast.success("Ticaret kaydı silindi");
      setDeleteTarget(null);
    } else {
      toast.error(r.error);
    }
  }

  return (
    <>
      <PageHeader
        icon={<BarChart3 size={20} />}
        title="Ticaret İşlemleri"
        subtitle="Yatırım + getiri özeti — alım-satım, döviz, kripto"
        actions={
          <Button
            variant="primary"
            size="md"
            onPress={() => setCreateOpen(true)}
            isDisabled={cariler.length === 0}
          >
            <Plus size={15} /> Yeni Ticaret Kaydı
          </Button>
        }
      />

      {cariler.length === 0 && (
        <div className="mb-6">
          <EmptyState
            compact
            icon={<BarChart3 size={22} />}
            title="Önce bir Ticaret profili eklemelisiniz"
            description="Profiller sayfasından tip=Harcama ve kategori=Ticaret olan bir profil oluşturun."
          />
        </div>
      )}

      <section className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Toplam Yatırım"
          value={formatPara(ozet.toplamYatirim)}
          hint={`${ozet.kayitSayisi} kayıt`}
        />
        <StatCard
          label="Toplam Getiri"
          value={formatPara(ozet.toplamGetiri)}
          tone="brand"
        />
        <StatCard
          label="Net Kâr"
          value={formatPara(ozet.netKar)}
          tone={netKarTone}
          icon={
            ozet.netKar >= 0 ? (
              <TrendingUp size={18} />
            ) : (
              <TrendingDown size={18} />
            )
          }
        />
        <StatCard
          label="Ortalama Kâr %"
          value={`${ozet.ortalamaKarYuzdesi.toFixed(2)}%`}
          tone={ortYuzdeTone}
        />
      </section>

      {items.length === 0 ? (
        <EmptyState
          icon={<BarChart3 size={28} />}
          title="Henüz ticaret kaydı yok"
          description="Yatırım yaptığınız her işlem için bir kayıt ekleyin, getiriyi sonradan güncelleyin."
          action={
            cariler.length > 0 ? (
              <Button
                variant="primary"
                size="md"
                onPress={() => setCreateOpen(true)}
              >
                <Plus size={15} /> İlk Kaydı Ekle
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <section
            className="mb-6 rounded-xl border p-4"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <h2 className="mb-3 text-sm font-semibold">
              Yatırım vs Getiri (son {chartData.length} kayıt)
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="ad"
                  stroke="var(--text-muted)"
                  fontSize={11}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("tr-TR", {
                      notation: "compact",
                    }).format(Number(v))
                  }
                />
                <Tooltip
                  formatter={(v) => formatPara(Number(v))}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="yatirim"
                  name="Yatırım"
                  fill="var(--text-muted)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="getiri"
                  name="Getiri"
                  fill="var(--positive)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section
            className="overflow-hidden rounded-xl border"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead
                  className="text-left text-xs font-semibold uppercase tracking-wide"
                  style={{
                    background: "var(--surface-muted)",
                    color: "var(--text-muted)",
                  }}
                >
                  <tr>
                    <th className="px-4 py-3">Profil</th>
                    <th className="px-4 py-3">Başlık</th>
                    <th className="px-4 py-3 text-right">Yatırım</th>
                    <th className="px-4 py-3 text-right">Getiri</th>
                    <th className="px-4 py-3 text-right">Kâr</th>
                    <th className="px-4 py-3 text-right">Kâr %</th>
                    <th className="px-4 py-3">Tarih</th>
                    <th className="px-4 py-3 text-right">Eylemler</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => {
                    const negatif = r.kar < 0;
                    return (
                      <tr
                        key={r.id}
                        className="border-t"
                        style={{
                          borderColor: "var(--border)",
                          background: negatif
                            ? "var(--negative-soft)"
                            : undefined,
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.cari.unvan}</div>
                          <div
                            className="text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {r.cari.kod}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{r.baslik}</div>
                          {r.aciklama && (
                            <div
                              className="text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {r.aciklama}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatPara(r.yatirim, r.paraBirimi)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatPara(r.getiri, r.paraBirimi)}
                        </td>
                        <td
                          className="px-4 py-3 text-right font-semibold tabular-nums"
                          style={{
                            color: negatif
                              ? "var(--negative)"
                              : r.kar > 0
                                ? "var(--positive)"
                                : "var(--text)",
                          }}
                        >
                          {formatPara(r.kar, r.paraBirimi)}
                        </td>
                        <td
                          className="px-4 py-3 text-right font-semibold tabular-nums"
                          style={{
                            color: negatif
                              ? "var(--negative)"
                              : r.karYuzdesi > 0
                                ? "var(--positive)"
                                : "var(--text)",
                          }}
                        >
                          {r.karYuzdesi.toFixed(2)}%
                        </td>
                        <td
                          className="px-4 py-3 text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {formatTarih(r.olusturmaTarihi)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onPress={() => setEditTarget(r)}
                            >
                              <Pencil size={13} /> Getiri
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              isIconOnly
                              aria-label="Sil"
                              onPress={() => setDeleteTarget(r)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <YeniTicaretDialog
        isOpen={createOpen}
        cariler={cariler}
        onClose={() => setCreateOpen(false)}
      />

      <GetiriGuncelleDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Ticaret kaydını sil"
        description={
          deleteTarget
            ? `"${deleteTarget.baslik}" kaydı silinecek. Bu işlem geri alınamaz.`
            : ""
        }
        confirmText="Sil"
        variant="danger"
        isLoading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onDelete}
      />
    </>
  );
}

/* ============================================================
   Yeni Ticaret Kaydı modal
   ============================================================ */
function YeniTicaretDialog({
  isOpen,
  cariler,
  onClose,
}: {
  isOpen: boolean;
  cariler: CariRef[];
  onClose: () => void;
}) {
  const [pending, start] = useTransition();

  function onAction(formData: FormData) {
    const cariId = Number(formData.get("cariId"));
    const baslik = String(formData.get("baslik") ?? "");
    const aciklama = String(formData.get("aciklama") ?? "");
    const yatirim = Number(formData.get("yatirim"));
    const getiri = Number(formData.get("getiri"));
    const vadeTarihi = String(formData.get("vadeTarihi") ?? "");

    start(async () => {
      const r = await createTicaretKayit({
        cariId,
        baslik,
        aciklama,
        yatirim,
        getiri,
        vadeTarihi,
      });
      if (r.ok) {
        toast.success("Ticaret kaydı eklendi");
        onClose();
      } else {
        toast.error(r.error);
      }
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <DataModal
      isOpen={isOpen}
      onClose={onClose}
      title="Yeni Ticaret Kaydı"
      description="Yatırım ve (varsa) getiri tutarını girin"
      size="lg"
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
            form="ticaret-create-form"
            variant="primary"
            size="md"
            isDisabled={pending}
          >
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </>
      }
    >
      <form
        id="ticaret-create-form"
        action={onAction}
        className="space-y-4"
      >
        <Field>
          <Label htmlFor="cariId" required>
            Ticaret Profili
          </Label>
          <Select id="cariId" name="cariId" required>
            <option value="">— seçin —</option>
            {cariler.map((c) => (
              <option key={c.id} value={c.id}>
                {c.kod} — {c.unvan}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="baslik" required>
            Başlık
          </Label>
          <TextInput
            id="baslik"
            name="baslik"
            required
            minLength={2}
            placeholder="ör. BTC alım — Kasım"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="yatirim" required hint="₺">
              Yatırım
            </Label>
            <TextInput
              id="yatirim"
              name="yatirim"
              type="number"
              step="0.01"
              min="0.01"
              required
            />
          </Field>
          <Field>
            <Label htmlFor="getiri" hint="₺">
              Getiri (opsiyonel)
            </Label>
            <TextInput
              id="getiri"
              name="getiri"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
            />
          </Field>
        </div>
        <Field>
          <Label htmlFor="vadeTarihi" required>
            İşlem Tarihi
          </Label>
          <TextInput
            id="vadeTarihi"
            name="vadeTarihi"
            type="date"
            required
            defaultValue={today}
          />
        </Field>
        <Field>
          <Label htmlFor="aciklama">Açıklama</Label>
          <TextArea id="aciklama" name="aciklama" rows={2} />
        </Field>
      </form>
    </DataModal>
  );
}

/* ============================================================
   Getiri güncelle modal
   ============================================================ */
function GetiriGuncelleDialog({
  target,
  onClose,
}: {
  target: TicaretRow | null;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  if (!target) return null;

  function onAction(formData: FormData) {
    const getiri = Number(formData.get("getiri"));
    if (!target) return;
    const id = target.id;
    start(async () => {
      const r = await updateTicaretGetiri(id, getiri);
      if (r.ok) {
        toast.success("Getiri güncellendi");
        onClose();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <DataModal
      isOpen={target !== null}
      onClose={onClose}
      title={`Getiri Güncelle — ${target.baslik}`}
      description={`Yatırım: ${formatPara(target.yatirim, target.paraBirimi)}`}
      size="sm"
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
            form="ticaret-getiri-form"
            variant="primary"
            size="md"
            isDisabled={pending}
          >
            {pending ? "Kaydediliyor…" : "Güncelle"}
          </Button>
        </>
      }
    >
      <form
        id="ticaret-getiri-form"
        action={onAction}
        className="space-y-4"
      >
        <Field>
          <Label htmlFor="getiri" required hint={target.paraBirimi}>
            Getiri Tutarı
          </Label>
          <TextInput
            id="getiri"
            name="getiri"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={target.getiri}
            autoFocus
          />
        </Field>
      </form>
    </DataModal>
  );
}

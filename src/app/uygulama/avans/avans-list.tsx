"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import {
  HandCoins,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
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
  createAvansKayit,
  deleteAvansKayit,
  markAvansOdendi,
} from "./actions";

export interface CariRef {
  id: number;
  kod: string;
  unvan: string;
}

export interface AvansRow {
  id: number;
  cariId: number;
  baslik: string;
  aciklama: string | null;
  paraBirimi: string;
  tutar: number;
  geriOdemeTarihi: string;
  geriOdendi: boolean;
  geriOdenenTutar: number;
  gecikti: boolean;
  yaklasiyor: boolean;
  olusturmaTarihi: string;
  cari: { id: number; kod: string; unvan: string };
}

interface Ozet {
  toplamAvansVerilen: number;
  toplamGeriAlinan: number;
  toplamBekleyen: number;
  gecikenSayisi: number;
  yaklasanSayisi: number;
}

type Tab = "bekleyen" | "tamamlanan";

interface Props {
  items: AvansRow[];
  cariler: CariRef[];
  ozet: Ozet;
}

export function AvansList({ items, cariler, ozet }: Props) {
  const [tab, setTab] = useState<Tab>("bekleyen");
  const [createOpen, setCreateOpen] = useState(false);
  const [odendiTarget, setOdendiTarget] = useState<AvansRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AvansRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const bekleyenler = useMemo(
    () =>
      items
        .filter((r) => !r.geriOdendi)
        .sort(
          (a, b) =>
            new Date(a.geriOdemeTarihi).getTime() -
            new Date(b.geriOdemeTarihi).getTime(),
        ),
    [items],
  );
  const tamamlananlar = useMemo(
    () => items.filter((r) => r.geriOdendi),
    [items],
  );

  const visible = tab === "bekleyen" ? bekleyenler : tamamlananlar;

  async function onDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await deleteAvansKayit(deleteTarget.id);
    setDeleting(false);
    if (r.ok) {
      toast.success("Avans kaydı silindi");
      setDeleteTarget(null);
    } else {
      toast.error(r.error);
    }
  }

  return (
    <>
      <PageHeader
        icon={<HandCoins size={20} />}
        title="Avans Ödemeleri"
        subtitle="Geri alınabilir ileri tarihli ödemelerin takibi"
        actions={
          <Button
            variant="primary"
            size="md"
            onPress={() => setCreateOpen(true)}
            isDisabled={cariler.length === 0}
          >
            <Plus size={15} /> Yeni Avans
          </Button>
        }
      />

      {cariler.length === 0 && (
        <div className="mb-6">
          <EmptyState
            compact
            icon={<HandCoins size={22} />}
            title="Önce bir Avans profili eklemelisiniz"
            description="Profiller sayfasından tip=Harcama ve kategori=Avans olan bir profil oluşturun."
          />
        </div>
      )}

      <section className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Toplam Avans Verilen"
          value={formatPara(ozet.toplamAvansVerilen)}
          hint={`${items.length} kayıt`}
        />
        <StatCard
          label="Toplam Geri Alınan"
          value={formatPara(ozet.toplamGeriAlinan)}
          tone="positive"
        />
        <StatCard
          label="Bekleyen"
          value={formatPara(ozet.toplamBekleyen)}
          tone="warning"
          hint={
            ozet.yaklasanSayisi > 0
              ? `${ozet.yaklasanSayisi} kayıt 7 gün içinde`
              : undefined
          }
        />
        <StatCard
          label="Geciken Sayısı"
          value={ozet.gecikenSayisi.toString()}
          tone={ozet.gecikenSayisi > 0 ? "negative" : "neutral"}
          icon={
            ozet.gecikenSayisi > 0 ? <AlertCircle size={18} /> : undefined
          }
        />
      </section>

      {items.length === 0 ? (
        <EmptyState
          icon={<HandCoins size={28} />}
          title="Henüz avans kaydı yok"
          description="Verdiğiniz her avans için bir kayıt ekleyin, geri ödendiğinde işaretleyin."
          action={
            cariler.length > 0 ? (
              <Button
                variant="primary"
                size="md"
                onPress={() => setCreateOpen(true)}
              >
                <Plus size={15} /> İlk Avansı Ekle
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="mb-3 inline-flex items-center gap-1 rounded-lg border p-1"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}>
            <TabButton
              active={tab === "bekleyen"}
              onPress={() => setTab("bekleyen")}
            >
              Bekleyenler ({bekleyenler.length})
            </TabButton>
            <TabButton
              active={tab === "tamamlanan"}
              onPress={() => setTab("tamamlanan")}
            >
              Tamamlananlar ({tamamlananlar.length})
            </TabButton>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              compact
              icon={<HandCoins size={22} />}
              title={
                tab === "bekleyen"
                  ? "Bekleyen avans yok"
                  : "Tamamlanmış avans yok"
              }
            />
          ) : (
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
                      <th className="px-4 py-3">Açıklama</th>
                      <th className="px-4 py-3 text-right">Tutar</th>
                      <th className="px-4 py-3">Vade</th>
                      <th className="px-4 py-3 text-right">Geri Ödenen</th>
                      <th className="px-4 py-3">Durum</th>
                      <th className="px-4 py-3 text-right">Eylemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t"
                        style={{
                          borderColor: "var(--border)",
                          background: r.gecikti
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
                          {formatPara(r.tutar, r.paraBirimi)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {formatTarih(r.geriOdemeTarihi)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {r.geriOdendi
                            ? formatPara(r.geriOdenenTutar, r.paraBirimi)
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <DurumBadge row={r} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {!r.geriOdendi && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onPress={() => setOdendiTarget(r)}
                              >
                                <CheckCircle2 size={13} /> Geri Ödendi
                              </Button>
                            )}
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
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      <YeniAvansDialog
        isOpen={createOpen}
        cariler={cariler}
        onClose={() => setCreateOpen(false)}
      />

      <GeriOdendiDialog
        target={odendiTarget}
        onClose={() => setOdendiTarget(null)}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Avans kaydını sil"
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

function TabButton({
  active,
  onPress,
  children,
}: {
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="rounded-md px-3 py-1.5 text-sm transition-colors"
      style={{
        background: active ? "var(--surface-muted)" : "transparent",
        color: active ? "var(--text)" : "var(--text-muted)",
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

function DurumBadge({ row }: { row: AvansRow }) {
  if (row.geriOdendi) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
        style={{
          background: "var(--positive-soft)",
          color: "var(--positive)",
        }}
      >
        <CheckCircle2 size={12} /> Tamamlandı
      </span>
    );
  }
  if (row.gecikti) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
        style={{
          background: "var(--negative-soft)",
          color: "var(--negative)",
        }}
      >
        <AlertCircle size={12} /> Gecikti
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        background: "var(--warning-soft)",
        color: "var(--warning)",
      }}
    >
      <Clock size={12} /> Bekliyor
    </span>
  );
}

/* ============================================================
   Yeni Avans modal
   ============================================================ */
function YeniAvansDialog({
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
    const tutar = Number(formData.get("tutar"));
    const geriOdemeTarihi = String(formData.get("geriOdemeTarihi") ?? "");

    start(async () => {
      const r = await createAvansKayit({
        cariId,
        baslik,
        aciklama,
        tutar,
        geriOdemeTarihi,
      });
      if (r.ok) {
        toast.success("Avans kaydı eklendi");
        onClose();
      } else {
        toast.error(r.error);
      }
    });
  }

  const defaultDate = new Date(Date.now() + 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  return (
    <DataModal
      isOpen={isOpen}
      onClose={onClose}
      title="Yeni Avans"
      description="Geri alınmak üzere verilen ödeme"
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
            form="avans-create-form"
            variant="primary"
            size="md"
            isDisabled={pending}
          >
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </>
      }
    >
      <form id="avans-create-form" action={onAction} className="space-y-4">
        <Field>
          <Label htmlFor="cariId" required>
            Avans Profili
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
            placeholder="ör. Personel maaş avansı"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="tutar" required hint="₺">
              Tutar
            </Label>
            <TextInput
              id="tutar"
              name="tutar"
              type="number"
              step="0.01"
              min="0.01"
              required
            />
          </Field>
          <Field>
            <Label htmlFor="geriOdemeTarihi" required>
              Geri Ödeme Tarihi
            </Label>
            <TextInput
              id="geriOdemeTarihi"
              name="geriOdemeTarihi"
              type="date"
              required
              defaultValue={defaultDate}
            />
          </Field>
        </div>
        <Field>
          <Label htmlFor="aciklama">Açıklama</Label>
          <TextArea id="aciklama" name="aciklama" rows={2} />
        </Field>
      </form>
    </DataModal>
  );
}

/* ============================================================
   Geri Ödendi Olarak İşaretle modal
   ============================================================ */
function GeriOdendiDialog({
  target,
  onClose,
}: {
  target: AvansRow | null;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  if (!target) return null;

  function onAction(formData: FormData) {
    if (!target) return;
    const id = target.id;
    start(async () => {
      const r = await markAvansOdendi(id, formData);
      if (r.ok) {
        toast.success("Avans geri ödendi olarak işaretlendi");
        onClose();
      } else {
        toast.error(r.error);
      }
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <DataModal
      isOpen={target !== null}
      onClose={onClose}
      title={`Geri Ödendi — ${target.baslik}`}
      description={`Avans tutarı: ${formatPara(target.tutar, target.paraBirimi)}`}
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
            form="avans-odendi-form"
            variant="primary"
            size="md"
            isDisabled={pending}
          >
            {pending ? "Kaydediliyor…" : "İşaretle"}
          </Button>
        </>
      }
    >
      <form
        id="avans-odendi-form"
        action={onAction}
        className="space-y-4"
      >
        <Field>
          <Label htmlFor="tarih" required>
            Geri Ödeme Tarihi
          </Label>
          <TextInput
            id="tarih"
            name="tarih"
            type="date"
            required
            defaultValue={today}
          />
        </Field>
        <Field>
          <Label htmlFor="tutar" required hint={target.paraBirimi}>
            Geri Ödenen Tutar
          </Label>
          <TextInput
            id="tutar"
            name="tutar"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={target.tutar}
            autoFocus
          />
        </Field>
      </form>
    </DataModal>
  );
}

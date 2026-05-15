"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Plus, Pencil, Trash2, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "../profil-form";
import { DataModal } from "@/components/ui/data-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Label, Select, TextArea, TextInput } from "@/components/ui/form-field";
import { EmptyState } from "@/components/ui/empty-state";
import { TAG_COLORS, type TagColor, tagColorClass } from "@/lib/enums";
import { createTag, updateTag, deleteTag } from "./actions";

export interface TagRow {
  id: number;
  ad: string;
  renk: string;
  aciklama: string | null;
  kullanimSayisi: number;
}

export function EtiketlerList({ tags }: { tags: TagRow[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TagRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openYeni() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openDuzenle(t: TagRow) {
    setEditing(t);
    setDialogOpen(true);
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await deleteTag(deleteTarget.id);
    setDeleting(false);
    if (r.ok) {
      toast.success("Etiket silindi");
      setDeleteTarget(null);
      router.refresh();
    } else toast.error(r.error);
  }

  return (
    <>
      <SectionCard
        title="Etiketler"
        description="Profillere atayabileceğiniz renkli etiketler (örn: A Müşteri, VIP, Yeni)"
      >
        <div className="mb-4 flex justify-end">
          <Button variant="primary" size="md" onPress={openYeni}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> Yeni Etiket
            </span>
          </Button>
        </div>

        {tags.length === 0 ? (
          <EmptyState
            compact
            icon={<TagIcon size={22} />}
            title="Henüz etiket yok"
            description="Profilleri sınıflandırmak için etiket oluşturun (örn: A Müşteri, Tedarikçi, VIP)"
          />
        ) : (
          <div className="space-y-2">
            {tags.map((t) => {
              const c = tagColorClass[t.renk as TagColor] ?? tagColorClass.gray;
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        background: c.bg,
                        color: c.text,
                        borderColor: c.border,
                      }}
                    >
                      <TagIcon size={11} />
                      {t.ad}
                    </span>
                    {t.aciklama && (
                      <span
                        className="text-sm"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {t.aciklama}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-soft)" }}
                    >
                      {t.kullanimSayisi} profil
                    </span>
                    <button
                      onClick={() => openDuzenle(t)}
                      className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                      style={{ color: "var(--text-muted)" }}
                      aria-label="Düzenle"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                      style={{ color: "var(--negative)" }}
                      aria-label="Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <EtiketDialog
        isOpen={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={`"${deleteTarget?.ad}" etiketi silinsin mi?`}
        description={
          deleteTarget && deleteTarget.kullanimSayisi > 0
            ? `${deleteTarget.kullanimSayisi} profile bağlı. Etiket silinince profiller etkilenmez, sadece etiket kaldırılır.`
            : "Bu etiket hiç kullanılmıyor."
        }
        confirmText="Sil"
        variant="danger"
        isLoading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}

function EtiketDialog({
  isOpen,
  editing,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  editing: TagRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = editing !== null;
  const [pending, start] = useTransition();
  const [selectedColor, setSelectedColor] = useState<TagColor>(
    (editing?.renk as TagColor) ?? "gray",
  );

  async function submit(formData: FormData) {
    const r = isEdit
      ? await updateTag(editing.id, formData)
      : await createTag(formData);
    if (r.ok) {
      toast.success(isEdit ? "Etiket güncellendi" : "Etiket oluşturuldu");
      onSaved();
    } else toast.error(r.error);
  }

  const formKey = `${isEdit ? editing.id : "new"}-${isOpen}`;

  return (
    <DataModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `"${editing.ad}" etiketini düzenle` : "Yeni Etiket"}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="md" onPress={onClose} isDisabled={pending}>
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
      <form
        id={formKey}
        action={(fd) => start(() => void submit(fd))}
        className="space-y-4"
      >
        <Field>
          <Label htmlFor="ad" required>
            Etiket Adı
          </Label>
          <TextInput
            id="ad"
            name="ad"
            required
            maxLength={50}
            defaultValue={editing?.ad ?? ""}
            placeholder="ör. A Müşteri, VIP, Tedarikçi"
          />
        </Field>

        <Field>
          <Label htmlFor="renk">Renk</Label>
          <input type="hidden" name="renk" value={selectedColor} />
          <div className="grid grid-cols-8 gap-2">
            {TAG_COLORS.map((c) => {
              const cls = tagColorClass[c];
              const isSelected = selectedColor === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className="aspect-square rounded-md border-2 transition-transform hover:scale-110"
                  style={{
                    background: cls.bg,
                    borderColor: isSelected ? "var(--text)" : cls.border,
                    boxShadow: isSelected
                      ? "0 0 0 2px var(--surface), 0 0 0 4px var(--text)"
                      : "none",
                  }}
                  aria-label={c}
                  title={c}
                />
              );
            })}
          </div>
        </Field>

        <Field>
          <Label htmlFor="aciklama">Açıklama</Label>
          <TextArea
            id="aciklama"
            name="aciklama"
            rows={2}
            defaultValue={editing?.aciklama ?? ""}
            placeholder="Bu etiketin neyi temsil ettiği (opsiyonel)"
          />
        </Field>
      </form>
    </DataModal>
  );
}

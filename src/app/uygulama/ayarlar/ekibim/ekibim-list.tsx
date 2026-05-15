"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import {
  UserPlus,
  Trash2,
  KeyRound,
  Mail,
  Shield,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "../profil-form";
import { DataModal } from "@/components/ui/data-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Label, Select, TextInput } from "@/components/ui/form-field";
import { OrgRole } from "@/lib/org";
import { addMember, removeMember, resetMemberPassword, updateMemberRole } from "./actions";
import { formatTarihUzun } from "@/lib/format";

export interface MemberRow {
  id: string;
  userId: string;
  adSoyad: string | null;
  email: string;
  role: string;
  joinedAt: string;
  sonAyAktivite: number;
}

interface Props {
  orgAd: string;
  currentUserId: string;
  currentRole: string;
  members: MemberRow[];
}

const ROLE_LABEL: Record<string, string> = {
  Owner: "Sahip",
  Admin: "Yönetici",
  Muhasebeci: "Muhasebeci",
  Goruntuleyici: "Görüntüleyici",
};

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  Owner: {
    bg: "var(--brand-soft)",
    color: "var(--brand)",
  },
  Admin: {
    bg: "var(--warning-soft)",
    color: "var(--warning)",
  },
  Muhasebeci: {
    bg: "var(--positive-soft)",
    color: "var(--positive)",
  },
  Goruntuleyici: {
    bg: "var(--surface-muted)",
    color: "var(--text-muted)",
  },
};

export function EkibimList({
  orgAd,
  currentUserId,
  currentRole,
  members,
}: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const [resetTarget, setResetTarget] = useState<MemberRow | null>(null);

  const isOwner = currentRole === OrgRole.Owner;

  return (
    <>
      <SectionCard
        title={`${orgAd} — Ekip Üyeleri`}
        description={`${members.length} üye. ${
          isOwner
            ? "Yeni üye ekleyebilir, rolleri değiştirebilirsiniz."
            : "Sadece Sahip yeni üye ekleyebilir veya rolleri değiştirebilir."
        }`}
      >
        {isOwner && (
          <div className="mb-4 flex justify-end">
            <Button
              variant="primary"
              size="md"
              onPress={() => setDialogOpen(true)}
            >
              <span className="inline-flex items-center gap-1.5">
                <UserPlus size={15} /> Yeni Üye Ekle
              </span>
            </Button>
          </div>
        )}

        <ul className="space-y-2">
          {members.map((m) => {
            const badge = ROLE_BADGE[m.role] ?? ROLE_BADGE.Goruntuleyici;
            const isCurrentUser = m.userId === currentUserId;
            const canManage = isOwner && m.role !== OrgRole.Owner && !isCurrentUser;
            return (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="grid size-10 place-items-center rounded-full text-sm font-semibold"
                    style={{
                      background: badge.bg,
                      color: badge.color,
                    }}
                  >
                    {(m.adSoyad ?? m.email)
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {m.adSoyad ?? m.email}
                      {isCurrentUser && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px]"
                          style={{
                            background: "var(--surface-muted)",
                            color: "var(--text-soft)",
                          }}
                        >
                          siz
                        </span>
                      )}
                    </div>
                    <div
                      className="flex items-center gap-1 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Mail size={11} /> {m.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      <Shield size={11} />
                      {ROLE_LABEL[m.role] ?? m.role}
                    </span>
                    <div
                      className="mt-1 flex items-center gap-1 text-[11px]"
                      style={{ color: "var(--text-soft)" }}
                    >
                      <History size={10} /> son ay {m.sonAyAktivite} işlem
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <select
                        defaultValue={m.role}
                        onChange={async (e) => {
                          const r = await updateMemberRole(
                            m.id,
                            e.target.value as never,
                          );
                          if (r.ok) {
                            toast.success("Rol güncellendi");
                            router.refresh();
                          } else toast.error(r.error);
                        }}
                        className="rounded-md border px-2 py-1 text-xs"
                        style={{
                          background: "var(--surface)",
                          borderColor: "var(--border-strong)",
                          color: "var(--text)",
                        }}
                      >
                        <option value={OrgRole.Admin}>
                          {ROLE_LABEL.Admin}
                        </option>
                        <option value={OrgRole.Muhasebeci}>
                          {ROLE_LABEL.Muhasebeci}
                        </option>
                        <option value={OrgRole.Goruntuleyici}>
                          {ROLE_LABEL.Goruntuleyici}
                        </option>
                      </select>
                      <button
                        onClick={() => setResetTarget(m)}
                        className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                        style={{ color: "var(--text-muted)" }}
                        title="Şifre sıfırla"
                      >
                        <KeyRound size={13} />
                      </button>
                      <button
                        onClick={() => setRemoveTarget(m)}
                        className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                        style={{ color: "var(--negative)" }}
                        title="Şirketten çıkar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <AddMemberDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          router.refresh();
        }}
      />

      <ResetPasswordDialog
        target={resetTarget}
        onClose={() => setResetTarget(null)}
      />

      <ConfirmDialog
        isOpen={removeTarget !== null}
        title={`"${removeTarget?.adSoyad ?? removeTarget?.email}" çıkarılsın mı?`}
        description="Kullanıcı şirketten çıkarılacak. Eklediği veriler şirkette kalır. Kullanıcı hesabı silinmez."
        confirmText="Çıkar"
        variant="danger"
        isLoading={removing}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={async () => {
          if (!removeTarget) return;
          setRemoving(true);
          const r = await removeMember(removeTarget.id);
          setRemoving(false);
          if (r.ok) {
            toast.success("Üye çıkarıldı");
            setRemoveTarget(null);
            router.refresh();
          } else toast.error(r.error);
        }}
      />
    </>
  );
}

function AddMemberDialog({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, start] = useTransition();
  async function submit(formData: FormData) {
    const r = await addMember(formData);
    if (r.ok) {
      toast.success("Üye eklendi");
      onSaved();
    } else toast.error(r.error);
  }
  const formKey = `add-${isOpen}`;
  return (
    <DataModal
      isOpen={isOpen}
      onClose={onClose}
      title="Yeni Üye Ekle"
      description="Kullanıcı doğrudan oluşturulur ve bu e-posta + şifreyle giriş yapabilir."
      size="md"
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
            form={formKey}
            variant="primary"
            size="md"
            isDisabled={pending}
          >
            {pending ? "Ekleniyor…" : "Üye Ekle"}
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
          <Label htmlFor="adSoyad" required>
            Ad Soyad
          </Label>
          <TextInput
            id="adSoyad"
            name="adSoyad"
            required
            minLength={2}
            placeholder="Mehmet Demir"
          />
        </Field>
        <Field>
          <Label htmlFor="email" required>
            E-posta
          </Label>
          <TextInput
            id="email"
            name="email"
            type="email"
            required
            placeholder="mehmet@firma.com"
          />
        </Field>
        <Field>
          <Label htmlFor="sifre" required hint="en az 6 karakter">
            Geçici Şifre
          </Label>
          <TextInput
            id="sifre"
            name="sifre"
            type="password"
            required
            minLength={6}
            placeholder="Kullanıcı sonra Ayarlar > Profil'den değiştirebilir"
          />
        </Field>
        <Field>
          <Label htmlFor="role" required>
            Rol
          </Label>
          <Select
            id="role"
            name="role"
            required
            defaultValue={OrgRole.Muhasebeci}
          >
            <option value={OrgRole.Admin}>
              Yönetici — kullanıcı yönetimi hariç tam yetki
            </option>
            <option value={OrgRole.Muhasebeci}>
              Muhasebeci — CRUD yetkisi
            </option>
            <option value={OrgRole.Goruntuleyici}>
              Görüntüleyici — sadece okuma
            </option>
          </Select>
        </Field>
      </form>
    </DataModal>
  );
}

function ResetPasswordDialog({
  target,
  onClose,
}: {
  target: MemberRow | null;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [sifre, setSifre] = useState("");

  async function submit() {
    if (!target) return;
    start(async () => {
      const r = await resetMemberPassword(target.id, sifre);
      if (r.ok) {
        toast.success(`${target.adSoyad ?? target.email} şifresi sıfırlandı`);
        setSifre("");
        onClose();
      } else toast.error(r.error);
    });
  }

  return (
    <DataModal
      isOpen={target !== null}
      onClose={onClose}
      title={`${target?.adSoyad ?? target?.email} — Şifre Sıfırla`}
      description="Bu kullanıcı için yeni geçici şifre belirleyin. Mevcut şifre geçersiz olacak."
      size="md"
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
            variant="danger"
            size="md"
            onPress={submit}
            isDisabled={pending || sifre.length < 6}
          >
            {pending ? "Sıfırlanıyor…" : "Şifreyi Sıfırla"}
          </Button>
        </>
      }
    >
      <Field>
        <Label htmlFor="yeniSifre" required hint="en az 6 karakter">
          Yeni Şifre
        </Label>
        <TextInput
          id="yeniSifre"
          type="password"
          minLength={6}
          value={sifre}
          onChange={(e) => setSifre(e.target.value)}
          autoFocus
        />
      </Field>
    </DataModal>
  );
}

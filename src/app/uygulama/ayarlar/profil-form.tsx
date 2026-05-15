"use client";

import { useTransition } from "react";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { Field, Label, TextInput } from "@/components/ui/form-field";
import { updateUserProfil, updatePassword } from "./actions";
import { formatTarihUzun } from "@/lib/format";

interface Props {
  initial: {
    email: string;
    adSoyad: string;
    kayitTarihi: string;
    hasPassword: boolean;
  };
}

export function ProfilForm({ initial }: Props) {
  const [profilPending, profilStart] = useTransition();
  const [sifrePending, sifreStart] = useTransition();

  async function onSubmitProfil(formData: FormData) {
    const r = await updateUserProfil(formData);
    if (r.ok) toast.success("Profil güncellendi");
    else toast.error(r.error);
  }
  async function onSubmitSifre(formData: FormData) {
    const r = await updatePassword(formData);
    if (r.ok) {
      toast.success("Şifre değiştirildi");
      (document.getElementById("sifre-form") as HTMLFormElement)?.reset();
    } else toast.error(r.error);
  }

  return (
    <div className="space-y-6">
      {/* Profil bilgileri */}
      <SectionCard
        title="Profil Bilgileri"
        description="Görünen adınız ve giriş e-postanız"
      >
        <form action={(fd) => profilStart(() => void onSubmitProfil(fd))} className="space-y-4">
          <Field>
            <Label htmlFor="adSoyad" required>
              Ad Soyad
            </Label>
            <TextInput
              id="adSoyad"
              name="adSoyad"
              required
              minLength={2}
              defaultValue={initial.adSoyad}
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
              defaultValue={initial.email}
            />
          </Field>
          <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Hesap oluşturma: {formatTarihUzun(initial.kayitTarihi)}
            </span>
            <Button type="submit" variant="primary" size="md" isDisabled={profilPending}>
              {profilPending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* Şifre değiştir */}
      {initial.hasPassword && (
        <SectionCard
          title="Şifre"
          description="Hesabınız için yeni bir şifre belirleyin"
        >
          <form
            id="sifre-form"
            action={(fd) => sifreStart(() => void onSubmitSifre(fd))}
            className="space-y-4"
          >
            <Field>
              <Label htmlFor="mevcutSifre" required>
                Mevcut Şifre
              </Label>
              <TextInput
                id="mevcutSifre"
                name="mevcutSifre"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="yeniSifre" required>
                  Yeni Şifre
                </Label>
                <TextInput
                  id="yeniSifre"
                  name="yeniSifre"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </Field>
              <Field>
                <Label htmlFor="yeniSifreTekrar" required>
                  Yeni Şifre Tekrar
                </Label>
                <TextInput
                  id="yeniSifreTekrar"
                  name="yeniSifreTekrar"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </Field>
            </div>
            <div className="flex justify-end border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <Button type="submit" variant="primary" size="md" isDisabled={sifrePending}>
                {sifrePending ? "Değiştiriliyor…" : "Şifreyi Değiştir"}
              </Button>
            </div>
          </form>
        </SectionCard>
      )}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-xl border"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <header
        className="border-b px-5 py-4"
        style={{ borderColor: "var(--border)" }}
      >
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            {description}
          </p>
        )}
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}
